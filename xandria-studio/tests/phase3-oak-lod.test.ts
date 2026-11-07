/**
 * VoxBox Phase 3: oak LOD triangle counts, measured — not estimated.
 * Phase 1 left oak at 80/40/20 as an estimate from geometry construction
 * (icosahedron detail 0 = 20 faces × ball counts 4/2/1); this test pins the
 * built foliage geometry with empty undergrowth, mirroring the pine pins
 * in visual-breakout-b4.test.ts (kinds: [] isolates the canopy).
 */
import { describe, expect, it } from 'vitest';
import { oakFoliage, type UndergrowthCtx } from '../src/engine/world/Vegetation';
import { Rng } from '../src/engine/core/Rng';

describe('phase3 oak LOD counts', () => {
  const emptyUg: UndergrowthCtx = { kinds: [], rng: new Rng(1) };
  const tris = (lod: 0 | 1 | 2) => oakFoliage(lod, emptyUg).attributes.position.count / 3;

  it('oak foliage triangle counts are 80/40/20 (4/2/1 icosahedron balls)', () => {
    expect(tris(0)).toBe(80);
    expect(tris(1)).toBe(40);
    expect(tris(2)).toBe(20);
  });
});
