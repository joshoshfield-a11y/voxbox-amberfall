/**
 * VoxBox Phase 3 — voxel pass 2 (environment dressing), bucket-neutral.
 *
 * What shipped:
 * - Chunked scatter: per-instance MATRIX variation only (non-uniform
 *   scale jitter + small pitch/roll tumble from the same per-chunk rng
 *   stream) — same pool set, same counts, same geometries. A 1.6x count
 *   multiplier was tried and HALTED: it broke the pinned per-chunk
 *   budget invariant (tests/perf-tiers.test.ts) and the exact reference
 *   censuses (tests/phone-playability-perf.test.ts). Counts stay at the
 *   PropSets targets; variation, not volume, is the pass.
 * - Landmark detail: tower/arch/bridge detail emits into the SAME
 *   Instancer buckets (tower still exactly 2: rock+dark; arch still one
 *   shared rock material; bridge still <= 2 materials).
 * - Watchtower detail: rock/dark/amber box buckets only, no new bucket.
 *
 * What was HALTED and is NOT in the tree:
 * - Ground-paint litter fleck: tests/terrain-rebase pins the
 *   ground-color digests bit-identically ("future changes must keep THIS
 *   digest"), so no color-term change can ship. The ground-paint tests
 *   below guard the unchanged recipe only.
 *
 * DOM is stubbed (no jsdom here) — same pattern as chunk-scatter.test.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Rng, Noise2D } from '../src/engine/core/Rng';
import { Physics } from '../src/engine/core/Physics';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { Instancer, amberGlowMaterial } from '../src/engine/gfx/AmberGlow';
import { buildBeamTower, buildRuinArch, buildBridge } from '../src/engine/gfx/Landmarks';
import { emitWatchtower } from '../src/engine/gfx/StructureSets';
import { Scatter } from '../src/engine/world/Scatter';
import { Terrain } from '../src/engine/world/Terrain';
import { scatterGrid } from '../src/engine/world/ChunkGrid';
import { chunkWorldRect } from '../src/engine/world/chunkLayout';
import {
  deriveGroundColors, paintGroundVertex, highColorForGroundKind,
  type GroundPaintCtx,
} from '../src/engine/world/groundPaint';
import { resolveBiomeDef } from '../src/engine/world/Biomes';
import { generateSpec } from '../src/generator/generate';

function makeEl(tag = 'div'): any {
  const el: any = {
    tag, children: [] as any[], style: {} as Record<string, string>,
    appendChild(c: any) { el.children.push(c); return c; },
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
    }),
  };
  return el;
}
beforeEach(() => {
  (globalThis as any).document = { createElement: (t: string) => makeEl(t), head: makeEl('head') };
});

function build(intent: string, seed: number, size: number, opts: any, quality: any, forceTrees = false) {
  const spec: any = generateSpec(intent, { seed });
  spec.world.terrain.size = size;
  spec.world.terrain.type = 'hills';
  spec.world.portals = { enabled: false };
  if (forceTrees) spec.world.scatter.trees = true;
  const physics = new Physics(spec.world.gravity);
  const mats = new MaterialLibrary(spec);
  const scene = new THREE.Scene();
  const terrain = new Terrain(spec, physics, mats, scene);
  const scatter = new Scatter(spec, terrain, mats, physics, scene, { ...opts, quality });
  return { scatter, spec, physics, scene, mats, terrain };
}

function buildBig() {
  return build('a heroic knight adventure through ancient forest ruins', 20261012, 1500,
    { exclusion: [{ x: 0, z: 0, r: 12 }] }, 'retro', true);
}

describe('Phase 3 — chunked dressing variation (counts unchanged)', () => {
  it('pool set is unchanged vs the legacy path (draw calls flat)', () => {
    const big = buildBig().scatter;
    const small = build('a heroic knight adventure through ancient forest ruins', 20261012, 220,
      { exclusion: [{ x: 0, z: 0, r: 12 }] }, 'retro', true).scatter;
    expect(big.chunked).not.toBeNull();
    expect(small.chunked).toBeNull();
    expect(big.sets.length).toBe(small.sets.length);
    expect(big.sets.map((s) => s.tag).sort()).toEqual(small.sets.map((s) => s.tag).sort());
  });

  it('per-chunk counts stay within the budgets (no multiplier)', () => {
    const { scatter, terrain } = buildBig();
    const c = scatter.chunked!;
    c.loadChunk(2, 2);
    const counts = c.chunkCounts(2, 2);
    const budgets = c.setBudgets();
    for (const [k, n] of Object.entries(counts)) {
      expect(n, `${k} in chunk 2,2`).toBeLessThanOrEqual(budgets[k]);
    }
    // grid/rect helpers stay consistent (used by the placement math)
    const grid = scatterGrid(terrain);
    const rect = chunkWorldRect(2, 2, grid);
    expect(rect.x1).toBeGreaterThan(rect.x0);
    expect(rect.z1).toBeGreaterThan(rect.z0);
  });

  it('same chunk → same matrices across runs (jitter is seeded, not random)', () => {
    const a = buildBig().scatter.chunked!;
    const b = buildBig().scatter.chunked!;
    a.loadChunk(2, 2);
    b.loadChunk(2, 2);
    expect([...a.chunkMatrices('rocks', 2, 2)!]).toEqual([...b.chunkMatrices('rocks', 2, 2)!]);
    expect([...a.chunkMatrices('hero-stones', 2, 2)!]).toEqual([...b.chunkMatrices('hero-stones', 2, 2)!]);
  });

  it('per-instance variation rides on the matrices (distinct scales, same geometry)', () => {
    const c = buildBig().scatter.chunked!;
    c.loadChunk(2, 2);
    const m = c.chunkMatrices('rocks', 2, 2)!;
    const triples = new Set<string>();
    for (let i = 0; i < m.length / 16; i++) {
      const o = i * 16;
      const sx = Math.hypot(m[o], m[o + 1], m[o + 2]);
      const sy = Math.hypot(m[o + 4], m[o + 5], m[o + 6]);
      const sz = Math.hypot(m[o + 8], m[o + 9], m[o + 10]);
      triples.add(`${sx.toFixed(3)}/${sy.toFixed(3)}/${sz.toFixed(3)}`);
    }
    expect(triples.size).toBeGreaterThan(5);
    // one pool mesh for the set: variation did not split the pool
    const rocksSet = c.sets.find((s) => s.tag === 'base' && s.mesh.geometry.type === 'DodecahedronGeometry');
    expect(rocksSet).toBeDefined();
  });
});

describe('Phase 3 — landmark detail stays in existing buckets', () => {
  function landmarkMats() {
    const spec: any = generateSpec('a heroic knight adventure', { seed: 4242 });
    const mats = new MaterialLibrary(spec);
    const p = spec.theme.palette;
    return { mats, lp: { primary: p.primary, secondary: p.secondary, accent: p.accent, rock: p.rock, ground: p.ground } };
  }

  it('tower: still exactly 2 instanced buckets, more instances than the bare tiers', () => {
    const { mats, lp } = landmarkMats();
    const inst = new Instancer();
    const g = buildBeamTower(new Rng(11), mats, lp, { inst });
    const ims = inst.bake(g);
    expect(ims.length).toBe(2);
    expect(inst.instanceCount).toBeGreaterThan(10);
  });

  it('arch: still one shared rock material, footing/stub detail present', () => {
    const { mats, lp } = landmarkMats();
    const inst = new Instancer();
    const arch = buildRuinArch(new Rng(12), mats, lp, inst);
    const baked = inst.bake(arch);
    expect(baked.length).toBeGreaterThan(0);
    expect(new Set(baked.map((im) => im.material)).size).toBe(1);
    expect(inst.instanceCount).toBeGreaterThan(7);
  });

  it('bridge: still <= 2 materials, footings present', () => {
    const { mats, lp } = landmarkMats();
    const inst = new Instancer();
    const bridge = buildBridge(new Rng(13), mats, lp, () => -2, 20, 4, inst);
    const bb = inst.bake(bridge);
    expect(new Set(bb.map((im) => im.material)).size).toBeLessThanOrEqual(2);
    expect(inst.instanceCount).toBeGreaterThan(16);
  });

  it('landmark detail is deterministic', () => {
    const mk = () => {
      const { mats, lp } = landmarkMats();
      const inst = new Instancer();
      const g = buildBeamTower(new Rng(31), mats, lp, { inst });
      const ims = inst.bake(g);
      return ims.map((im) => Array.from(im.instanceMatrix.array)).flat();
    };
    expect(mk()).toEqual(mk());
  });
});

describe('Phase 3 — watchtower detail stays in existing buckets', () => {
  it('rock/dark/amber box buckets only, footing + brace + shard instances', () => {
    const spec: any = generateSpec('a heroic knight adventure', { seed: 4242 });
    const mats = new MaterialLibrary(spec);
    const biome = resolveBiomeDef(spec);
    const setMats = {
      rock: mats.standard('rock', biome.palette.rock, { roughness: 1 }),
      dark: mats.standard('rock', biome.palette.secondary, { roughness: 1 }),
      amber: amberGlowMaterial(mats, 2.6),
      teal: mats.glow('#59d8ff', 2.0),
    };
    const inst = new Instancer();
    const g = new THREE.Group();
    emitWatchtower(inst, new Rng(7), setMats, { ox: 0, oy: 0, oz: 0 });
    const baked = inst.bake(g);
    // 3 box buckets (rock/dark/amber); no octa/teal bucket appears
    expect(baked.length).toBe(3);
    expect(baked.every((im) => im.geometry.type === 'BoxGeometry')).toBe(true);
    expect(inst.instanceCount).toBeGreaterThanOrEqual(30);
  });
});

describe('Phase 3 — ground paint unchanged (litter fleck halted)', () => {
  function testCtx(): { ctx: GroundPaintCtx; noise: Noise2D } {
    const g = new THREE.Color('#6a7f42').convertLinearToSRGB();
    const a = new THREE.Color('#7f9450').convertLinearToSRGB();
    const r = new THREE.Color('#6e6a5e').convertLinearToSRGB();
    const ctx: GroundPaintCtx = {
      colors: deriveGroundColors(g, a, r, highColorForGroundKind('ground', a)),
      waterY: 2.0,
      maxHeight: 60,
      discs: [],
      paths: [],
    };
    return { ctx, noise: new Noise2D(1234) };
  }

  it('deterministic: same inputs → identical color', () => {
    const { ctx, noise } = testCtx();
    const a = new THREE.Color(), b = new THREE.Color();
    paintGroundVertex(a, ctx, noise, 10, 20, 5, 1.0);
    paintGroundVertex(b, ctx, noise, 10, 20, 5, 1.0);
    expect([a.r, a.g, a.b]).toEqual([b.r, b.g, b.b]);
  });

  it('macro patchiness still varies colors across a flat patch', () => {
    const { ctx, noise } = testCtx();
    const colors = new Set<string>();
    let minLum = Infinity, maxLum = -Infinity;
    for (let x = 0; x <= 40; x += 2) {
      for (let z = 0; z <= 40; z += 2) {
        const c = new THREE.Color();
        paintGroundVertex(c, ctx, noise, x, z, 5, 1.0);
        colors.add(`${c.r.toFixed(4)}/${c.g.toFixed(4)}/${c.b.toFixed(4)}`);
        const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
        minLum = Math.min(minLum, lum);
        maxLum = Math.max(maxLum, lum);
      }
    }
    expect(colors.size).toBeGreaterThan(50);
    expect(maxLum - minLum).toBeGreaterThan(0.05);
  });
});
