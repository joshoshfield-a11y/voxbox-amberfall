/**
 * VoxBox Phase 3 — B6 follow-up (D-005): emissive bumps measured by the
 * bloom-isolation probe (evidence/phase3/probes/bloom/results.json).
 *
 * Rec.709 linear luminance of the amber accent #ff9e2e is ~0.459, so an
 * emissive intensity reads as luminance 0.459 × intensity, NOT as the
 * intensity itself. Measured in the probe (emissive-only, UnrealBloomPass
 * strength 0.45 / radius 0.6):
 * - accent @2.0 = 0.92: blooms only when sun-facing (lit vertical face).
 * - accent @2.4 = 1.10: blooms in lit conditions (lit crystal box).
 * - accent @2.8 = 1.29: blooms in all orientations, at threshold 1.15
 *   AND at the deferred 1.25 — so the bumps are safe for either threshold.
 * Threshold stays 1.15 here: tests/visual-breakout-b6.test.ts pins it, and
 * moving it needs a coordinator-authorized pin update (see Phase 3 report).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Rng } from '../src/engine/core/Rng';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { BLOOM_THRESHOLD } from '../src/engine/gfx/PostFX';
import { makeCrystal, makeRunestone, type PropPalette } from '../src/engine/gfx/Props';
import { definePropSets, propSetCtx, type PropSetCtx } from '../src/engine/world/PropSets';
import type { Terrain } from '../src/engine/world/Terrain';
import { generateSpec } from '../src/generator/generate';

function makeEl(tag = 'div'): any {
  const el: any = {
    tag,
    children: [] as any[],
    style: {} as Record<string, string>,
    appendChild(c: any) { el.children.push(c); return c; },
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
    }),
  };
  return el;
}

beforeEach(() => {
  (globalThis as any).document = {
    createElement: (t: string) => makeEl(t),
    head: makeEl('head'),
  };
});

const PAL: PropPalette = {
  primary: '#888888', secondary: '#777777',
  accent: '#ff9e2e', rock: '#9a9484', ground: '#6b5a44',
};

function glowIntensities(group: THREE.Group): number[] {
  const out: number[] = [];
  group.traverse((o: any) => {
    const m = o.material as THREE.MeshStandardMaterial | undefined;
    if (m && m.emissive && !m.emissive.equals(new THREE.Color(0x000000))) {
      out.push(m.emissiveIntensity);
    }
  });
  return out;
}

function heroIntensity(genre: string, key: string): number {
  const spec = generateSpec('phase3 bloom probe', { seed: 99, genre: genre as any, environment: 'ruins' });
  const mats = new MaterialLibrary(spec);
  // definePropSets only reads terrain.size (via propSetCtx); place samplers
  // are never invoked here, so a stub terrain is a faithful seam.
  const ctx: PropSetCtx = propSetCtx(spec, { size: 256 } as unknown as Terrain, mats, { quality: 'standard' });
  const def = definePropSets(ctx, mats).find((d) => d.key === key);
  expect(def).toBeDefined();
  const mat = def!.makeMat(mats) as THREE.MeshStandardMaterial;
  return mat.emissiveIntensity;
}

describe('phase3 bloom bumps', () => {
  it('threshold stays 1.15 (b6 pin; 1.25 move needs coordinator authorization)', () => {
    expect(BLOOM_THRESHOLD).toBe(1.15);
  });

  it('crystal cluster glow is 2.4 (was 1.6: never bloomed, even lit)', () => {
    const spec = generateSpec('phase3 bloom probe', { seed: 99, genre: 'third-person-action', environment: 'ruins' });
    const mats = new MaterialLibrary(spec);
    const ints = glowIntensities(makeCrystal(new Rng(7), mats, PAL));
    expect(ints.length).toBeGreaterThan(0);
    expect(new Set(ints).size).toBe(1);
    expect(ints[0]).toBe(2.4);
  });

  it('runestone rune face glow is 2.8 (was 2.0: sun-facing only)', () => {
    const spec = generateSpec('phase3 bloom probe', { seed: 99, genre: 'third-person-action', environment: 'ruins' });
    const mats = new MaterialLibrary(spec);
    const ints = glowIntensities(makeRunestone(new Rng(7), mats, PAL));
    expect(ints).toEqual([2.8]);
  });

  it('racing hero-posts glow is 2.4 (was 1.6)', () => {
    expect(heroIntensity('racing', 'hero-posts')).toBe(2.4);
  });

  it('top-down hero-pylons glow is 2.8 (was 2.0)', () => {
    expect(heroIntensity('top-down-shooter', 'hero-pylons')).toBe(2.8);
  });
});
