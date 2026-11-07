/**
 * VoxBox breakout B1 — bright golden dusk light rig.
 *
 * New-behavior tests only (no existing assertion is changed). The dusk rig
 * is retuned toward daylight while spec timeOfDay stays "dusk" and the night
 * path stays locked at its pinned values.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createSky } from '../src/engine/gfx/Sky';
import { createAtmosphere } from '../src/engine/gfx/Atmosphere';
import { gradeAtmosphere } from '../src/engine/gfx/GenreGrade';
import { generateSpec } from '../src/generator/generate';

function duskSpec() {
  const spec: any = generateSpec('a sword adventure in ancient ruins');
  expect(spec.meta.genre).toBe('third-person-action');
  spec.theme.timeOfDay = 'dusk';
  spec.theme.weather = 'clear';
  return spec;
}

describe('breakout B1: bright golden dusk light rig', () => {
  it('dusk sun is brighter and warmer, fill lifted, shadow box unchanged', () => {
    const spec = duskSpec();
    const scene = new THREE.Scene();
    const sky = createSky(spec, scene, 'standard');
    // third-person-action grade sun/hemi/ambient are all 1.0, so the rig
    // values land exactly on the breakout numbers.
    expect(sky.sun.intensity).toBeCloseTo(2.05, 6);
    expect(sky.sun.color.getHex()).toBe(0xffc07a);
    expect(sky.hemi.intensity).toBeCloseTo(1.05, 6);
    expect(sky.ambient.intensity).toBeCloseTo(0.35, 6);
    // shadow camera stays the player-local ±90 m box; only bias tuning moved.
    expect(sky.sun.shadow.camera.left).toBe(-90);
    expect(sky.sun.shadow.camera.right).toBe(90);
    expect(sky.sun.shadow.bias).toBeCloseTo(-0.0008, 6);
    expect(sky.sun.shadow.normalBias).toBeCloseTo(0.03, 6);
    sky.dispose();
  });

  it('night rig stays locked at its pinned values', () => {
    const spec = duskSpec();
    spec.theme.timeOfDay = 'night';
    const scene = new THREE.Scene();
    const sky = createSky(spec, scene, 'standard');
    expect(sky.sun.intensity).toBeCloseTo(1.8, 6);
    expect(sky.hemi.intensity).toBeCloseTo(1.3, 6);
    expect(sky.ambient.intensity).toBeCloseTo(0.9, 6);
    sky.dispose();
  });

  it('dusk grade thins fog, brightens fog and dome, keeps pinned exposure', () => {
    const day = gradeAtmosphere('third-person-action', 'day');
    const dusk = gradeAtmosphere('third-person-action', 'dusk');
    expect(dusk.exposure).toBe(0.72);
    expect(dusk.fogDensity).toBeCloseTo(day.fogDensity * 0.8, 6);
    expect(dusk.fogLuminance).toBeCloseTo(day.fogLuminance * 0.98, 6);
    expect(dusk.sky).toBeCloseTo(Math.min(1, day.sky * 1.4), 6);
    // fog-overexposure bounds still hold after the brightening.
    expect(dusk.fogDensity).toBeLessThanOrEqual(1.5);
    expect(dusk.fogLuminance).toBeLessThanOrEqual(1.0);
    expect(dusk.sky).toBeLessThanOrEqual(1.0);
  });

  it('dusk sun elevation is raised (16°, not the old 3° night-slope)', () => {
    const spec = duskSpec();
    const atmo = createAtmosphere(spec);
    // setFromSphericalCoords: y = cos(90° - elevation) = sin(elevation).
    // 16° -> ~0.276; the old 3° gave ~0.052.
    expect(atmo.sunDir.y).toBeGreaterThan(0.2);
    expect(atmo.sunDir.y).toBeLessThan(0.35);
    atmo.dome.material instanceof THREE.Material && atmo.dome.material.dispose();
  });
});
