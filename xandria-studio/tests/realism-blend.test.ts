/**
 * VoxBox realism phase R1 (2026-11-02) — tile blending.
 *
 * User decision 2026-11-02: terrain tiles MUST blend/feather into each
 * other — no hard unblended edges between terrain types. The recipe in
 * groundPaint.ts widens every band window and warps band boundaries
 * with low-frequency noise. These tests measure the feather directly on
 * paintGroundVertex transects (no rendering needed):
 *
 * - Slope transect (ny 1.0 -> 0.25, fixed world position, fixed height):
 *   the ground->scree->rock->cliff transition must span a real slope
 *   range with no single-step luminance jump (a hard edge would show
 *   as one large step between two adjacent samples).
 * - Altitude transect (y 0 -> maxHeight): the cap fade must span a
 *   real height range, again with no single-step jump.
 * - Wet transect (y across the water plane): the wet band must fade
 *   in on both sides of the waterline, not step on at it.
 * - Purity: painting the same (x, z, y, ny) twice gives bit-identical
 *   colors, and painting at a different (x, z) with the same y/ny can
 *   differ (the warp is spatial, not a global shift) — the seam /
 *   determinism contract from the recipe header still holds.
 *
 * The cosmetic wear/overlay path is untouched by R1 and is NOT
 * asserted here; overlays remain drawn over bases, never baked in.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { paintGroundVertex, deriveGroundColors, type GroundPaintCtx } from '../src/engine/world/groundPaint';
import { Noise2D } from '../src/engine/core/Rng';

function ctx(): GroundPaintCtx {
  const ground = new THREE.Color('#8a8a52').convertLinearToSRGB();
  const alt = new THREE.Color('#a3a85e').convertLinearToSRGB();
  const rock = new THREE.Color('#8a7a62').convertLinearToSRGB();
  const high = new THREE.Color('#f2f6fc').convertLinearToSRGB();
  return {
    colors: deriveGroundColors(ground, alt, rock, high),
    waterY: 2.0, maxHeight: 40, discs: [], paths: [],
  };
}

function luma(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function dist(a: THREE.Color, b: THREE.Color): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Max adjacent-sample step along a transect, and the number of samples in the middle band. */
function transectStats(samples: THREE.Color[]): { maxStep: number; midCount: number; total: number } {
  const total = dist(samples[0], samples[samples.length - 1]);
  let maxStep = 0;
  let midCount = 0;
  for (let i = 1; i < samples.length; i++) {
    const s = dist(samples[i - 1], samples[i]);
    if (s > maxStep) maxStep = s;
    const f = total > 0 ? dist(samples[0], samples[i]) / total : 0;
    if (f > 0.2 && f < 0.8) midCount++;
  }
  return { maxStep, midCount, total };
}

describe('realism R1 tile blending', () => {
  it('slope transect feathers across a real range with no hard step', () => {
    const c = ctx();
    const noise = new Noise2D(3712409144);
    const samples: THREE.Color[] = [];
    // ny 1.0 -> 0.25 in 0.025 steps, fixed position/height, flat-enough
    // height so altitude/wet terms stay out of the way.
    for (let ny = 1.0; ny >= 0.25 - 1e-9; ny -= 0.025) {
      const col = new THREE.Color();
      paintGroundVertex(col, c, noise, 120, -80, 10, ny);
      samples.push(col);
    }
    const { maxStep, midCount, total } = transectStats(samples);
    expect(total).toBeGreaterThan(0.15); // the transect actually changes type
    expect(maxStep).toBeLessThan(0.12); // no single hard-edge jump
    expect(midCount).toBeGreaterThanOrEqual(6); // feather spans >= 6 samples (~0.15 ny)
  });

  it('altitude transect feathers the cap fade', () => {
    const c = ctx();
    c.waterY = null; // keep the wet band out of this transect
    const noise = new Noise2D(3712409144);
    const samples: THREE.Color[] = [];
    for (let y = 0; y <= 40; y += 1) {
      const col = new THREE.Color();
      paintGroundVertex(col, c, noise, 120, -80, y, 1.0);
      samples.push(col);
    }
    const { maxStep, midCount, total } = transectStats(samples);
    expect(total).toBeGreaterThan(0.1);
    expect(maxStep).toBeLessThan(0.12);
    expect(midCount).toBeGreaterThanOrEqual(6); // cap fades over >= 6 m
  });

  it('wet transect fades out gradually above the waterline', () => {
    // The wet term darkens ground at/below the water plane and fades
    // upward across a 1.8 m window (-0.6..+1.2, warped) — it must not
    // step off at the waterline. Sampled at 0.25 m steps.
    const c = ctx();
    const noise = new Noise2D(3712409144);
    const samples: THREE.Color[] = [];
    for (let y = 0; y <= 5; y += 0.125) {
      const col = new THREE.Color();
      paintGroundVertex(col, c, noise, 120, -80, y, 1.0);
      samples.push(col);
    }
    const { maxStep, midCount, total } = transectStats(samples);
    expect(total).toBeGreaterThan(0.1);
    expect(maxStep).toBeLessThan(0.2);
    expect(midCount).toBeGreaterThanOrEqual(4); // middle of the fade spans >= 0.5 m
    for (let i = 1; i < samples.length; i++) {
      expect(luma(samples[i])).toBeGreaterThanOrEqual(luma(samples[i - 1]) - 1e-6);
    }
  });

  it('painting is pure in world coords (determinism contract)', () => {
    const c = ctx();
    const noise = new Noise2D(3712409144);
    const a = new THREE.Color();
    const b = new THREE.Color();
    paintGroundVertex(a, c, noise, 120, -80, 10, 0.6);
    paintGroundVertex(b, c, noise, 120, -80, 10, 0.6);
    expect(a.r).toBe(b.r);
    expect(a.g).toBe(b.g);
    expect(a.b).toBe(b.b);
    // Same y/ny elsewhere can differ: the warp is spatial.
    const elsewhere = new THREE.Color();
    paintGroundVertex(elsewhere, c, noise, 420, 310, 10, 0.6);
    expect(dist(a, elsewhere)).toBeGreaterThan(0);
  });
});
