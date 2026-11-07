/**
 * PHASE2 (combat-flash finding): the humanoid/drone/RigAdapter blink loops
 * overwrote owned emissives and never restored them. The humanoid loop
 * ended on black (harmless for base flats, a wipe for skin glows); the
 * drone loop ended RED (stuck at 0.9 forever). All three now snapshot at
 * flash() and restore on expiry.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { makeHumanoid, makeDrone } from '../src/engine/gfx/Characters';
import { makeRigFromGLTF } from '../src/engine/gfx/RigAdapter';

/* minimal DOM stub (MaterialLibrary builds canvas textures lazily) */
(globalThis as any).document = {
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

function stdMats(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.MeshStandardMaterial)?.emissive) {
      out.push(m.material as THREE.MeshStandardMaterial);
    }
  });
  return out;
}

/** Run animate() until the 0.25 s flash envelope has expired. */
function runOut(animate: (t: number, speed: number, opts?: any) => void, calls = 30) {
  for (let i = 0; i < calls; i++) animate(i * 0.1, 0);
}

describe('phase2 flash restore', () => {
  it('humanoid: a skin glow survives a hit flash (restored on expiry)', () => {
    const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, 11);
    const mats = stdMats(rig.group);
    expect(mats.length).toBeGreaterThan(0);
    // a skin glow on one owned material, as applySkin would set it
    const skinMat = mats[0];
    skinMat.emissive.setHex(0x35e0ff);
    skinMat.emissiveIntensity = 1.2;
    rig.flash();
    rig.animate(0, 0);
    // the flash itself still reads: first frame is the red "on" blink
    expect(skinMat.emissive.getHex()).toBe(0xff2222);
    expect(skinMat.emissiveIntensity).toBe(0.8);
    runOut((t, s) => rig.animate(t, s));
    expect(skinMat.emissive.getHex()).toBe(0x35e0ff);
    expect(skinMat.emissiveIntensity).toBe(1.2);
  });

  it('humanoid: a mid-flash re-hit restores the ORIGINAL emissive, not the blink', () => {
    const rig = makeHumanoid(new MaterialLibrary(testSpec), {}, 11);
    const mat = stdMats(rig.group)[0];
    mat.emissive.setHex(0xffcc55);
    mat.emissiveIntensity = 0.8;
    rig.flash();
    rig.animate(0, 0); // now blinking red
    rig.flash(); // re-hit mid-flash: snapshot must NOT be overwritten by red
    runOut((t, s) => rig.animate(t, s));
    expect(mat.emissive.getHex()).toBe(0xffcc55);
    expect(mat.emissiveIntensity).toBe(0.8);
  });

  it('drone: a flashed drone does NOT stay red after the envelope', () => {
    const rig = makeDrone(new MaterialLibrary(testSpec), '#c33', '#ff4444', 11);
    const before = stdMats(rig.group).map((m) => [m.emissive.getHex(), m.emissiveIntensity] as const);
    rig.flash();
    runOut((t, s) => rig.animate(t, s));
    const after = stdMats(rig.group).map((m) => [m.emissive.getHex(), m.emissiveIntensity] as const);
    expect(after).toEqual(before);
    for (const [hex, inten] of after) {
      expect(!(hex === 0xff2222 && inten === 0.9)).toBe(true);
    }
  });

  it('rig-adapter: an imported model glow survives a hit flash', () => {
    const mat = new THREE.MeshStandardMaterial({ color: '#888888' });
    mat.emissive.setHex(0x00ff88);
    mat.emissiveIntensity = 1.5;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), mat);
    const scene = new THREE.Group();
    scene.add(mesh);
    const rig = makeRigFromGLTF({ scene });
    // The rig owns per-instance CLONES of the import's materials (ownMaterials),
    // so the flash writes to the clone on mesh.material, not the source mat.
    const owned = mesh.material as THREE.MeshStandardMaterial;
    rig.flash();
    rig.animate(0, 0);
    expect(owned.emissive.getHex()).toBe(0xff2222);
    runOut((t, s) => rig.animate(t, s));
    expect(owned.emissive.getHex()).toBe(0x00ff88);
    expect(owned.emissiveIntensity).toBe(1.5);
  });
});
