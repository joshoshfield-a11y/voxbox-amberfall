/**
 * VoxBox breakout B5 (character readability) — new-behavior tests only;
 * no existing assertion is changed.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { makeHumanoid, type CharacterRig } from '../src/engine/gfx/Characters';

/* DOM stub (same shape as character-custom.test.ts): MaterialLibrary
 * builds canvas textures lazily. */
const ctx2d = () => ({
  set fillStyle(_v: string) {},
  get fillStyle() { return '#000'; },
  fillRect(..._a: unknown[]) {},
  beginPath() {},
  moveTo(..._a: unknown[]) {},
  lineTo(..._a: unknown[]) {},
  ellipse(..._a: unknown[]) {},
  fill() {},
  createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
  putImageData() {},
});
(globalThis as any).document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d() }),
};

const testSpec: any = {
  meta: { seed: 7, name: 'Test', genre: 'fps-arena' },
  custom: {},
  theme: { palette: { sky: '#000', ground: '#111', fog: '#222' }, retroFilter: false },
};

const roleMat = (rig: CharacterRig, role: string): THREE.MeshStandardMaterial | null => {
  let hit: THREE.MeshStandardMaterial | null = null;
  rig.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || hit) return;
    for (const mm of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[]) {
      if (mm.userData.role === role) { hit = mm as THREE.MeshStandardMaterial; break; }
    }
  });
  return hit;
};

/** Meshes whose faceted geometry is a sphere of the given radius.
 * part() facetes geometry (dropping the SphereGeometry parameters), but
 * vertex positions survive, so the bounding sphere still measures the
 * part radius: buckle 0.06, antenna tip 0.045, rivet 0.028. */
const spheresOf = (rig: CharacterRig, radius: number): THREE.MeshStandardMaterial[] => {
  const out: THREE.MeshStandardMaterial[] = [];
  rig.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (Math.abs(g.boundingSphere!.radius - radius) < 0.002) {
      for (const mm of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[]) {
        out.push(mm as THREE.MeshStandardMaterial);
      }
    }
  });
  return out;
};

describe('breakout B5: hero material richness', () => {
  it('owned shirt/accent read brighter: shirt 0.75, gold trim 0.35/0.6, pants/skin unchanged', () => {
    const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, 5);
    expect(roleMat(rig, 'shirt')!.roughness).toBeCloseTo(0.75, 6);
    expect(roleMat(rig, 'accent')!.roughness).toBeCloseTo(0.35, 6);
    expect(roleMat(rig, 'accent')!.metalness).toBeCloseTo(0.6, 6);
    expect(roleMat(rig, 'pants')!.roughness).toBeCloseTo(0.9, 6);
    expect(roleMat(rig, 'skin')!.roughness).toBeCloseTo(0.8, 6);
    // No emissive on owned materials — the combat flash loop overwrites
    // owned emissives and never restores them.
    for (const role of ['skin', 'shirt', 'pants', 'accent']) {
      expect(roleMat(rig, role)!.emissiveIntensity).toBe(1);
    }
    rig.dispose();
  });

  it('cape cloth (accentDS) shares the gold trim values and stays double-sided', () => {
    // The cape extra is seeded — sweep fixed seeds for a rig that has one.
    let cape: THREE.MeshStandardMaterial | null = null;
    for (let seed = 1; seed <= 32 && !cape; seed++) {
      const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, seed);
      cape = roleMat(rig, 'accentDS');
      if (!cape) rig.dispose();
      else {
        expect(cape.roughness).toBeCloseTo(0.35, 6);
        expect(cape.metalness).toBeCloseTo(0.6, 6);
        expect(cape.side).toBe(THREE.DoubleSide);
        rig.dispose();
      }
    }
    expect(cape).not.toBeNull();
  });

  it('bandolier buckle glows at 2.0 (shared cached glow, flash-proof)', () => {
    const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, 5, { armor: 'bandolier' });
    const buckles = spheresOf(rig, 0.06);
    expect(buckles.length).toBeGreaterThan(0);
    for (const m of buckles) expect(m.emissiveIntensity).toBe(2.0);
    rig.dispose();
  });

  it('armor rivets glow at 2.0 (shared cached glow, flash-proof)', () => {
    // Rivets are chance-gated (0.5) on pads/plate — sweep fixed seeds.
    // Filter by radius AND intensity 2.0: eyes share the 0.028 radius
    // class but glow at 2.2, so intensity is what isolates the rivets.
    let found = 0;
    for (let seed = 1; seed <= 32; seed++) {
      const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, seed, { armor: 'plate' });
      const rivets = spheresOf(rig, 0.028).filter((m) => m.emissiveIntensity === 2.0);
      found += rivets.length;
      rig.dispose();
    }
    expect(found).toBeGreaterThan(0);
  });
});
