/**
 * FIX1 regression (D-037): humanoid facing aligns with travel direction.
 *
 * Evidence the model faces +Z (not -Z): the visor band is a cylinder arc
 * centered on +Z, the eye spheres and boot toes sit at +Z, and the cape
 * root and backpack sit at -Z. The old code added +PI to the facing
 * rotation in CharacterController.update(), Npc, and EnemyAI walker/brute
 * paths, turning every humanoid exactly opposite its travel — the
 * reported moonwalk (face toward the camera while walking away).
 * tpAction's camYaw +PI offset is a different thing (it makes the
 * movement direction itself correct away from the camera) and is
 * untouched. The flyer path already used bare atan2 and is untouched.
 *
 * Also pins the touch-stick release path: releasing the move stick must
 * clear the axes (the user reported "stuck running"; no stuck-stick code
 * path was found, so this test proves the release path rather than
 * assuming it).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { makeHumanoid } from '../src/engine/gfx/Characters';
import { forgeHumanoidPlan } from '../src/engine/gfx/ModelForge';
import { Input } from '../src/engine/core/Input';

/* minimal DOM stub (same pattern as characters-polish.test.ts) */
(globalThis as any).document = {
  addEventListener() {},
  removeEventListener() {},
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData() {},
    }),
  }),
};

const testSpec: any = {
  meta: { seed: 7, name: 'Test', genre: 'fps-arena' },
  custom: {},
  theme: { palette: { sky: '#000', ground: '#111', fog: '#222' }, retroFilter: false },
};
const mats = () => new MaterialLibrary(testSpec);

/** first seed (1..200) whose plan includes a cape */
const capeSeed = (() => {
  for (let s = 1; s <= 200; s++) if (forgeHumanoidPlan(s).extras.includes('cape')) return s;
  return -1;
})();

/** the facing rotation the game code must use for a travel direction */
const facingYaw = (dx: number, dz: number) => Math.atan2(dx, dz);

describe('humanoid model forward is +Z', () => {
  it('boot toe sits at +Z in the knee (forward), not -Z', () => {
    const r = makeHumanoid(mats(), {}, 11);
    const knee = r.limbs.kneeL ?? r.limbs.joints!.kneeL;
    let toeZ = 0;
    knee.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.position.z > toeZ) toeZ = o.position.z;
    });
    expect(toeZ).toBeGreaterThan(0); // boot toe: +0.06*b forward
    r.dispose();
  });
  it('cape root sits at -Z (back) when a cape is present', () => {
    expect(capeSeed).toBeGreaterThan(0);
    const r = makeHumanoid(mats(), {}, capeSeed);
    const cape = r.limbs.cape!;
    expect(cape.length).toBeGreaterThan(0);
    expect(cape[0].parent!.position.z).toBeLessThan(0); // -0.26*b back
    r.dispose();
  });
});

describe('facing yaw maps model +Z onto travel direction', () => {
  const dirs: Array<[number, number]> = [
    [0, 1], [1, 0], [0, -1], [-1, 0], [0.6, 0.8], [-0.8, 0.6], [0.2, -0.98],
  ];
  for (const [dx, dz] of dirs) {
    it(`dir (${dx}, ${dz}): +Z after rotation equals travel`, () => {
      const o = new THREE.Object3D();
      o.rotation.y = facingYaw(dx, dz);
      const f = new THREE.Vector3(0, 0, 1).applyEuler(o.rotation);
      const len = Math.hypot(dx, dz);
      expect(f.x).toBeCloseTo(dx / len, 6);
      expect(f.z).toBeCloseTo(dz / len, 6);
    });
    it(`dir (${dx}, ${dz}): the old +PI pointed exactly backwards`, () => {
      const o = new THREE.Object3D();
      o.rotation.y = facingYaw(dx, dz) + Math.PI;
      const f = new THREE.Vector3(0, 0, 1).applyEuler(o.rotation);
      const len = Math.hypot(dx, dz);
      expect(f.x).toBeCloseTo(-dx / len, 6);
      expect(f.z).toBeCloseTo(-dz / len, 6);
    });
  }
});

describe('touch move-stick release clears the axes', () => {
  it('setMoveStick(null) zeroes axes after a held stick', () => {
    (globalThis as any).window = { addEventListener() {}, removeEventListener() {} };
    const canvas: any = {
      style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const input = new Input(canvas);
    input.setMoveStick({ lx: 0.6, ly: -0.4 }); // inside the unit circle: no length normalization
    expect(input.axes.x).toBeCloseTo(0.6, 6);
    expect(input.axes.y).toBeCloseTo(0.4, 6); // axes flips ly (up = +y)
    input.setMoveStick(null);
    expect(input.axes.x).toBe(0);
    expect(input.axes.y).toBe(0);
    input.dispose?.();
  });
});
