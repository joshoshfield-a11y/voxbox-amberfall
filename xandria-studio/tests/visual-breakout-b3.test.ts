/**
 * VoxBox breakout B3 (ground + grass) — new-behavior tests only; no
 * existing assertion is changed.
 */
import * as THREE from 'three';
import { describe, expect, it, beforeEach } from 'vitest';
import { Grass } from '../src/engine/world/Grass';
import { Terrain } from '../src/engine/world/Terrain';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { Physics } from '../src/engine/core/Physics';
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

function buildTerrain(env: string, biomeId?: string) {
  const spec: any = generateSpec('a heroic knight adventure', { seed: 99 });
  spec.theme.environment = env;
  if (biomeId) spec.custom = { ...(spec.custom ?? {}), biome: { biomeId } };
  const physics = new Physics(spec.world.gravity);
  const mats = new MaterialLibrary(spec);
  const scene = new THREE.Scene();
  const terrain = new Terrain(spec, physics, mats, scene);
  return { terrain, spec, scene };
}

describe('breakout B3: grass density', () => {
  it('standard forest out-counts retro by the new 3000/800 ratio', () => {
    const f = buildTerrain('forest', 'forest');
    const gStd = new Grass(f.spec, f.terrain, f.scene, { quality: 'standard' });
    const r = buildTerrain('forest', 'forest');
    const gRetro = new Grass(r.spec, r.terrain, r.scene, { quality: 'retro' });
    expect(gStd.count).toBeGreaterThan(gRetro.count * 3.0);
    expect(gRetro.count).toBeGreaterThan(0);
  });

  it('high still out-counts standard; volcanic stays zero', () => {
    const f = buildTerrain('forest', 'forest');
    const gHigh = new Grass(f.spec, f.terrain, f.scene, { quality: 'high' });
    const s = buildTerrain('forest', 'forest');
    const gStd = new Grass(s.spec, s.terrain, s.scene, { quality: 'standard' });
    expect(gHigh.count).toBeGreaterThan(gStd.count);
    const v = buildTerrain('volcanic', 'volcanic');
    const gVolc = new Grass(v.spec, v.terrain, v.scene, { quality: 'high' });
    expect(gVolc.count).toBe(0);
  });
});
