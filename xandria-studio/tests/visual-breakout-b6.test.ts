/**
 * VoxBox breakout B6 (post + grade) — new-behavior tests only; no existing
 * assertion is changed.
 */
import { describe, it, expect } from 'vitest';
import { BLOOM_THRESHOLD } from '../src/engine/gfx/PostFX';
import { GradeShader } from '../src/engine/gfx/GradeShader';
import { gradeAtmosphere } from '../src/engine/gfx/GenreGrade';

describe('breakout B6: bloom threshold + biome grade', () => {
  it('bloom threshold sits above the dusk sky horizon and below true HDR emitters', () => {
    // Dusk sky horizon ~1.03 (below); lamp orbs 2.6, doorways/windows 2.8,
    // lanterns 2.6, rune strips 2.0 emissive + sun diffuse (above).
    expect(BLOOM_THRESHOLD).toBe(1.15);
    expect(BLOOM_THRESHOLD).toBeGreaterThan(1.03);
    expect(BLOOM_THRESHOLD).toBeLessThan(2.0);
  });

  it('ruins and forest dusk grades carry the B6 brightening', () => {
    const ruins = gradeAtmosphere('third-person-action', 'dusk', 'ruins').grade;
    expect(ruins.gain).toEqual([1.06, 1.02, 0.94]);
    expect(ruins.saturation).toBe(1.14);
    expect(ruins.lift).toEqual([0.020, 0.010, -0.010]);
    const forest = gradeAtmosphere('third-person-action', 'dusk', 'forest').grade;
    expect(forest.gain).toEqual([1.05, 1.04, 0.94]);
    expect(forest.saturation).toBe(1.15);
    expect(forest.lift).toEqual([0.012, 0.018, -0.005]);
  });

  it('no-biome grade path is unchanged (the PostFX wiring adds biome, not new values)', () => {
    // Without a biome the genre base grade survives: third-person-action
    // dusk base lift/gain/saturation are the authored table values.
    const g = gradeAtmosphere('third-person-action', 'dusk').grade;
    expect(g.lift).toEqual([0.015, 0.005, -0.010]);
    expect(g.gain).toEqual([1.03, 1.0, 0.96]);
    expect(g.saturation).toBe(1.08);
  });

  it('the screen-writing grade pass performs the output transform', () => {
    // GradeShader is last in the standard chain (PostFX adds nothing after
    // it) and must carry the tonemapping + colorspace chunks, or HDR
    // values would write linear to the canvas.
    expect(GradeShader.fragmentShader).toContain('tonemapping_fragment');
    expect(GradeShader.fragmentShader).toContain('colorspace_fragment');
  });
});
