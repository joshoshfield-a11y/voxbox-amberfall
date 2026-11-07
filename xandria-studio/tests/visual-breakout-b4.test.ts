/**
 * VoxBox breakout B4 (vegetation) — new-behavior tests only; no existing
 * assertion is changed.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { pineFoliage, foliageVariation, type UndergrowthCtx } from '../src/engine/world/Vegetation';
import { Rng } from '../src/engine/core/Rng';

describe('breakout B4: foliage variation + layer tint', () => {
  const emptyUg: UndergrowthCtx = { kinds: [], rng: new Rng(1) };

  it('foliageVariation is deterministic, varied, and bounded', () => {
    // foliageVariation returns a shared scratch color — clone before
    // comparing, or every call would trivially equal itself.
    const a = foliageVariation(10, 20, 'pine').clone();
    const b = foliageVariation(10, 20, 'pine').clone();
    expect(a.r).toBe(b.r);
    expect(a.g).toBe(b.g);
    expect(a.b).toBe(b.b);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const c = foliageVariation(i * 7.3, i * 3.1, 'pine');
      expect(c.r).toBeGreaterThanOrEqual(0.85);
      expect(c.r).toBeLessThanOrEqual(1.0);
      expect(c.g).toBeGreaterThanOrEqual(0.85);
      expect(c.g).toBeLessThanOrEqual(1.0);
      expect(c.b).toBeGreaterThanOrEqual(0.85);
      expect(c.b).toBeLessThanOrEqual(1.0);
      seen.add(`${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)}`);
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('pine cone triangle counts are unchanged by the layer tint (V2 pins)', () => {
    // kinds: [] isolates the cones (no undergrowth triangles).
    const tris = (lod: 0 | 1 | 2) => pineFoliage(lod, emptyUg).attributes.position.count / 3;
    expect(tris(0)).toBe(54);
    expect(tris(1)).toBe(28);
    expect(tris(2)).toBe(10);
  });

  it('pine canopy tints bottom-dark to top-light', () => {
    const geo = pineFoliage(0, emptyUg);
    const col = geo.attributes.color as THREE.BufferAttribute;
    const lum = (i: number) => 0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i);
    // cones merge bottom -> top in layer order; first third = bottom cone.
    const n = col.count;
    let bottom = 0, top = 0;
    for (let i = 0; i < n / 3; i++) bottom += lum(i);
    for (let i = Math.floor((2 * n) / 3); i < n; i++) top += lum(i);
    expect(top / (n / 3)).toBeGreaterThan(bottom / (n / 3));
  });
});
