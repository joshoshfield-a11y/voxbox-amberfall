/**
 * VoxBox breakout B7 (sky) — new-behavior tests only; no existing assertion
 * is changed. The brighter dome itself landed in B1 (sky x1.4) and is
 * attributed there, not re-claimed here.
 */
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { generateSpec } from '../src/generator/generate';
import { gradeAtmosphere } from '../src/engine/gfx/GenreGrade';
import { LightShafts } from '../src/engine/gfx/LightShafts';

describe('breakout B7: softer clouds, stronger shafts', () => {
  it('dusk clouds are paler and 10% more transparent; day is untouched', () => {
    const dusk = gradeAtmosphere('third-person-action', 'dusk');
    expect(dusk.cloudColor).toBe('#ffe6c8');
    // Third-person-action base clouds 0.8 -> 0.72 at dusk.
    expect(dusk.clouds).toBeCloseTo(0.72, 10);
    const day = gradeAtmosphere('third-person-action', 'day');
    expect(day.cloudColor).toBe('#ffffff');
    expect(day.clouds).toBe(0.8);
  });

  it('shaft base alpha is raised (dusk effective range via the x1.7 boost)', () => {
    const mk = (tod: 'day' | 'dusk') => {
      const spec = generateSpec('a heroic knight adventure', { seed: 8, genre: 'third-person-action' });
      spec.theme.timeOfDay = tod;
      return new LightShafts(new THREE.Scene(), spec, new THREE.Vector3(0.5, 0.3, 0.5).normalize(), 'standard');
    };
    const uBase = (s: LightShafts) => (s as any).mats.map((m: THREE.ShaderMaterial) => m.uniforms.uBase.value as number);
    const day = uBase(mk('day'));
    expect(day.length).toBeGreaterThan(0);
    for (const v of day) { expect(v).toBeGreaterThanOrEqual(0.02); expect(v).toBeLessThanOrEqual(0.038); }
    const dusk = uBase(mk('dusk'));
    expect(dusk.length).toBe(day.length);
    for (const v of dusk) { expect(v).toBeGreaterThanOrEqual(0.034); expect(v).toBeLessThanOrEqual(0.065); }
  });
});
