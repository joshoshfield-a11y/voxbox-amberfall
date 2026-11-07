/**
 * VoxBox realism phase R2/R3 (2026-11-02) — material plumbing.
 *
 * R2: biomeGroundDef must stamp the layered-ground program (ground
 * layers flag + cache key) on every ground material, baked or canvas
 * path, so the slope/height-selected speckle layers actually run.
 * R3: leafy() must return a canopy material whose map + normal twin
 * are the 'leaf' canvas pair (not a flat color), with vertexColors
 * kept so per-instance canopy tints still multiply.
 *
 * DOM is stubbed (no jsdom) — same pattern as terrain.test.ts. In
 * this stubbed runtime the baked layer textures load as bare
 * Textures, so the test asserts the program stamp, not the shader
 * uniforms (those are set at first render in a real browser).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
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

function makeMats(): MaterialLibrary {
  const spec = generateSpec('a heroic knight adventure', { seed: 3712409144 });
  return new MaterialLibrary(spec);
}

describe('realism R2 ground layers', () => {
  it('biomeGroundDef stamps the layers program on the baked path', () => {
    const mats = makeMats();
    const m = mats.biomeGroundDef({ kind: 'ground', base: '#8a8a52', alt: '#a3a85e', roughness: 0.95, baked: 'ground-grass' }, { repeat: 8 });
    expect((m.userData as any).groundLayers).toBe(true);
    expect(m.customProgramCacheKey!()).toBe('xandria-ground-layers-v1');
  });

  it('biomeGroundDef stamps the layers program on the canvas path', () => {
    const mats = makeMats();
    const m = mats.biomeGroundDef({ kind: 'ground', base: '#8a8a52', alt: '#a3a85e', roughness: 0.95 }, { repeat: 8 });
    expect((m.userData as any).groundLayers).toBe(true);
    expect(m.customProgramCacheKey!()).toBe('xandria-ground-layers-v1');
  });
});

describe('realism R3 leafy canopy', () => {
  it('leafy carries a leaf map + normal twin and keeps vertexColors', () => {
    const mats = makeMats();
    const m = mats.leafy('#3f7a3a', { vertexColors: true });
    expect(m.map).toBeTruthy();
    expect(m.normalMap).toBeTruthy();
    expect(m.vertexColors).toBe(true);
    expect(m.roughness).toBe(0.85);
    // White base color: the map carries the canopy color (see leafy).
    expect(m.color.getHexString()).toBe('ffffff');
  });

  it('leafy is cached per color (same object twice)', () => {
    const mats = makeMats();
    expect(mats.leafy('#3f7a3a', { vertexColors: true })).toBe(mats.leafy('#3f7a3a', { vertexColors: true }));
  });
});
