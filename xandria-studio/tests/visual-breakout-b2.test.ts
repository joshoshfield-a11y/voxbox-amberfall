/**
 * VoxBox breakout B2 — baked ambient occlusion.
 *
 * aoDarken() is the whole new math; the wiring (multiply after
 * paintGroundVertex, detail chunks + far shell) is proven by the
 * terrain-rebase digest re-capture (colors move, normals do not) and by
 * the before/after captures. These tests pin the math and the
 * determinism of chunk builds.
 */
import * as THREE from 'three';
import { describe, expect, it, beforeEach } from 'vitest';
import { aoDarken } from '../src/engine/world/groundPaint';
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

describe('breakout B2: baked AO factor', () => {
  it('flat ground occludes nothing', () => {
    const s = [
      { h: 10, d: 12.5 }, { h: 10, d: 12.5 },
      { h: 10, d: 12.5 }, { h: 10, d: 12.5 },
    ];
    expect(aoDarken(10, s)).toBe(1);
  });

  it('a ridge (neighbors below) occludes nothing', () => {
    const s = [
      { h: 0, d: 12.5 }, { h: 2, d: 12.5 },
      { h: 5, d: 17.7 }, { h: 1, d: 17.7 },
    ];
    expect(aoDarken(10, s)).toBe(1);
  });

  it('a deep valley saturates at the 0.55 floor', () => {
    // rise >= 0.35 * distance on every sample -> occlusion 1 on all.
    const s = [
      { h: 20, d: 12.5 }, { h: 20, d: 12.5 },
      { h: 25, d: 17.7 }, { h: 25, d: 17.7 },
    ];
    expect(aoDarken(10, s)).toBeCloseTo(0.55, 6);
  });

  it('partial occlusion scales linearly and never brightens', () => {
    // one of four samples fully occluded -> 1 - 0.45 * 0.25 = 0.8875.
    const s = [
      { h: 20, d: 12.5 }, { h: 10, d: 12.5 },
      { h: 10, d: 17.7 }, { h: 10, d: 17.7 },
    ];
    expect(aoDarken(10, s)).toBeCloseTo(0.8875, 6);
    // a half-occluded sample contributes 0.5: rise = 0.5 * 0.35 * 12.5.
    const half = [
      { h: 12.1875, d: 12.5 }, { h: 10, d: 12.5 },
    ];
    expect(aoDarken(10, half)).toBeCloseTo(1 - 0.45 * 0.25, 6);
  });

  it('chunk builds with AO stay deterministic', () => {
    const build = () => {
      const spec: any = generateSpec('a heroic knight adventure', { seed: 7 });
      spec.world.terrain.type = 'hills';
      spec.world.terrain.size = 220;
      spec.world.portals = { enabled: false };
      const terrain = new Terrain(spec, new Physics(spec.world.gravity), new MaterialLibrary(spec), new THREE.Scene());
      // meshes build lazily — build every chunk explicitly, like the
      // terrain-rebase test does.
      const cps = Math.round(220 / terrain.chunkSize);
      for (let cj = 0; cj < cps; cj++)
        for (let ci = 0; ci < cps; ci++) terrain.ensureChunkMesh(ci, cj);
      const out: number[] = [];
      for (let cj = 0; cj < cps; cj++)
        for (let ci = 0; ci < cps; ci++) {
          const m = terrain.getChunkMesh(ci, cj)!;
          const col = m.geometry.attributes.color as THREE.BufferAttribute;
          for (let i = 0; i < col.array.length; i++) out.push(col.array[i]);
        }
      return out;
    };
    expect(build()).toEqual(build());
  });
});
