/**
 * VoxBox visual target V2 — geometry smoothing.
 * - Rounded body volumes take the smooth path: geometries stay INDEXED
 *   (smoothPart), so vertex normals average across shared vertices.
 * - Hard details stay faceted: horns, fins, spikes, eyes, rivets, emblem
 *   keep the de-indexed part() path (geometry.index === null).
 * - taperedDome narrows a helmet crown without changing triangle count
 *   or the index.
 * - Rig mesh counts stay within the NPC budget (the full-NPC bound lives
 *   in npc.test.ts; this guards the rig the budget is built from).
 * Pine foliage segments (Vegetation.ts, module-private) are covered by the
 * before/after capture measurements in evidence/visual-v2/, not here.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { makeHumanoid, taperedDome } from '../src/engine/gfx/Characters';
import { forgeHumanoidPlan } from '../src/engine/gfx/ModelForge';
import { pineFoliage } from '../src/engine/world/Vegetation';
import { Rng } from '../src/engine/core/Rng';

/* minimal DOM stub (MaterialLibrary builds canvas textures lazily) */
(globalThis as any).document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData() {},
    }),
  }),
};

const testSpec: any = {
  meta: { seed: 7, name: 'Test', genre: 'fps-arena' },
  custom: {},
  theme: { palette: { sky: '#000', ground: '#111', fog: '#222' }, retroFilter: false },
};
const mats = () => new MaterialLibrary(testSpec);
const rig = (seed = 11) => makeHumanoid(mats(), {}, seed);

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh); });
  return out;
};

/** First seed in 1..500 whose forged plan has the given head style (deterministic). */
const seedForStyle = (style: string): number => {
  for (let s = 1; s <= 500; s++) {
    if (forgeHumanoidPlan(s, {}).headStyle === style) return s;
  }
  throw new Error(`no seed found for headStyle ${style}`);
};

describe('V2 smooth path — rounded volumes stay indexed', () => {
  it('torso, head and limb segments are indexed (not de-indexed)', () => {
    const r = rig(11);
    const torso = r.limbs.torso as THREE.Mesh;
    expect(torso.geometry.index).not.toBeNull();
    // Indexed sphere (10x8) has 99 vertices; the faceted copy would have ~420.
    const head = r.limbs.head as THREE.Mesh;
    expect(head.geometry.index).not.toBeNull();
    expect(head.geometry.attributes.position.count).toBeLessThan(200);
    // Indexed torso cylinder (8 radial) has < 60 vertices; faceted ~96.
    expect(torso.geometry.attributes.position.count).toBeLessThan(60);
    // Upper-arm segment: second child of the shoulder pivot (delt, upper, elbow).
    const upper = r.limbs.armL.children[1] as THREE.Mesh;
    expect(upper.geometry.index).not.toBeNull();
    r.dispose();
  });

  it('helmet dome is tapered (crown narrower than rim) on a helmet-style rig', () => {
    const r = rig(seedForStyle('helmet'));
    const head = r.limbs.head as THREE.Mesh;
    // The dome is the only SphereGeometry child of the head (the head itself
    // is the parent mesh, not a child).
    const dome = head.children.find(
      (c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry.type === 'SphereGeometry',
    ) as THREE.Mesh | undefined;
    expect(dome).toBeDefined();
    expect(dome!.geometry.index).not.toBeNull();
    const pos = dome!.geometry.attributes.position as THREE.BufferAttribute;
    dome!.geometry.computeBoundingBox();
    const bb = dome!.geometry.boundingBox!;
    const top = (y: number) => y > bb.min.y + 0.9 * (bb.max.y - bb.min.y);
    let topMax = 0;
    let rimMax = 0;
    for (let i = 0; i < pos.count; i++) {
      const ax = Math.abs(pos.getX(i));
      if (top(pos.getY(i))) topMax = Math.max(topMax, ax);
      else rimMax = Math.max(rimMax, ax);
    }
    // The tapered crown's widest top-decile ring is strictly narrower than
    // the rim — an untapered dome would have topMax ≈ rimMax.
    expect(topMax).toBeLessThan(rimMax);
    r.dispose();
  });

  it('hard details stay faceted on a horned rig (horns de-indexed, band smooth)', () => {
    const r = rig(seedForStyle('horned'));
    const head = r.limbs.head as THREE.Mesh;
    const kids = head.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
    expect(kids.some((m) => m.geometry.index === null)).toBe(true); // the horns
    expect(kids.some((m) => m.geometry.index !== null)).toBe(true); // the visor band
    r.dispose();
  });
});

describe('taperedDome unit behavior', () => {
  const domeGeo = () => new THREE.SphereGeometry(0.17 * 1.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  it('preserves triangle count, index and bbox height; narrows the crown', () => {
    const before = domeGeo();
    const triBefore = before.index!.count;
    const posBefore = before.attributes.position.count;
    before.computeBoundingBox();
    const hBefore = before.boundingBox!.max.y - before.boundingBox!.min.y;
    // Rim ring sits at bbox min.y (t = 0) and is unscaled: its width is unchanged.
    const rimWidth = (g: THREE.BufferGeometry) => {
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      const p = g.attributes.position as THREE.BufferAttribute;
      let m = 0;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(p.getY(i) - bb.min.y) < 1e-6) m = Math.max(m, Math.abs(p.getX(i)));
      }
      return m;
    };
    const rimBefore = rimWidth(before);
    const after = taperedDome(domeGeo());
    expect(after.index!.count).toBe(triBefore);
    expect(after.attributes.position.count).toBe(posBefore);
    after.computeBoundingBox();
    expect(after.boundingBox!.max.y - after.boundingBox!.min.y).toBeCloseTo(hBefore, 6);
    expect(rimWidth(after)).toBeCloseTo(rimBefore, 6);
    // Crown vertices (top decile) shrink by the taper factor.
    const pos = after.attributes.position as THREE.BufferAttribute;
    const bb = after.boundingBox!;
    let topMax = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > bb.min.y + 0.9 * (bb.max.y - bb.min.y)) topMax = Math.max(topMax, Math.abs(pos.getX(i)));
    }
    const ref = domeGeo();
    ref.computeBoundingBox();
    const rbb = ref.boundingBox!;
    const rpos = ref.attributes.position as THREE.BufferAttribute;
    let refTopMax = 0;
    for (let i = 0; i < rpos.count; i++) {
      if (rpos.getY(i) > rbb.min.y + 0.9 * (rbb.max.y - rbb.min.y)) refTopMax = Math.max(refTopMax, Math.abs(rpos.getX(i)));
    }
    expect(topMax).toBeLessThan(refTopMax);
  });
});

describe('V2 pine foliage — rounder cone silhouettes', () => {
  // Empty undergrowth ctx: merged geometry is pure cones, so the triangle
  // count pins the segment values exactly (per cone: side seg + cap seg).
  const tris = (lod: 0 | 1 | 2) => {
    const g = pineFoliage(lod, { kinds: [], rng: new Rng(1) });
    // tag() de-indexes parts before merging, so triangles = vertices / 3.
    return g.attributes.position.count / 3;
  };
  it('LOD0: 3 cones x 9 segments = 54 triangles (was 42 at 7 segments)', () => {
    expect(tris(0)).toBe(54);
  });
  it('LOD1: 2 cones x 7 segments = 28 triangles (was 20 at 5 segments)', () => {
    expect(tris(1)).toBe(28);
  });
  it('LOD2 unchanged: 1 cone x 5 segments = 10 triangles', () => {
    expect(tris(2)).toBe(10);
  });
});

describe('V2 rig mesh budget guard', () => {
  it('rig mesh counts stay within the 60/NPC budget across seeds', () => {
    for (const seed of [11, 21, 33, 47, 99]) {
      const r = rig(seed);
      expect(meshesOf(r.group).length).toBeLessThanOrEqual(60);
      r.dispose();
    }
  });
});
