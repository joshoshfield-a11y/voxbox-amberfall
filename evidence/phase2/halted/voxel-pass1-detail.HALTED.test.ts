/**
 * VoxBox Phase 2 — voxel pass 1, character detail.
 * - Detail voxels are MERGED INTO the primary armor piece's geometry
 *   (mergeGeometries): one mesh per primary piece, subdivided into many
 *   voxel boxes. Mesh count, instancer bucket count, and draw-call count
 *   are unchanged by construction; only triangle counts rise.
 * - The pinned primary-piece census (armorPiece meshes) is unchanged,
 *   and the merged geometry keeps a BoxGeometry-style `parameters`
 *   object (bounding-box dims) so the armor signatures keep working.
 * - detail:false builds the base set only (the s25 tier gate).
 * - Visor-slit shape variants ride the set's own glow material (no new
 *   emissive role; villager visors stay non-ember, enemy visors ember).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/engine/gfx/Materials';
import { makeHumanoid, type CharacterRig } from '../src/engine/gfx/Characters';
import {
  VOXEL_ARMOR_SETS, ENEMY_ARMOR_SET_IDS,
  applyVoxelArmor, applyVoxelArmorSlot, clearVoxelArmor, applyEnemyArmor,
  isEmberHex,
} from '../src/engine/gfx/VoxelArmor';
import { VoxelGeoCache } from '../src/engine/game/voxelGeo';

const testSpec: any = {
  meta: { seed: 7, name: 'Test', genre: 'fps-arena' },
  custom: {},
  theme: { palette: { sky: '#000', ground: '#111', fog: '#222' }, retroFilter: false },
};
const mats = () => new MaterialLibrary(testSpec);
const rigOf = (seed = 11) => makeHumanoid(mats(), {}, seed, { headStyle: 'helmet', armor: 'none' });

const armorMeshes = (rig: CharacterRig): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  rig.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.userData as any).armorPiece === true) out.push(m);
  });
  return out;
};
const meshCount = (rig: CharacterRig): number => {
  let n = 0;
  rig.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) n++; });
  return n;
};
/** triangles in a mesh: every armor geometry is indexed, one box = 12 tris */
const tris = (m: THREE.Mesh): number => (m.geometry.index ? m.geometry.index.count / 3 : 0);
const armorTris = (rig: CharacterRig): number =>
  armorMeshes(rig).reduce((s, m) => s + tris(m), 0);
/** geometry+placement signature: pins seeded determinism of a built set */
const armorSig = (rig: CharacterRig): string =>
  armorMeshes(rig)
    .map((m) => {
      const p = (m.geometry as THREE.BoxGeometry).parameters as { width: number; height: number; depth: number; radius?: number };
      const q = m.position;
      // cones (enemy spikes) carry radius/height parameters, never merged
      const dims = p.radius !== undefined
        ? [p.radius.toFixed(4), p.height.toFixed(4)]
        : [p.width.toFixed(4), p.height.toFixed(4), p.depth.toFixed(4)];
      return [m.userData.armorSlot, m.userData.armorSet, ...dims,
        q.x.toFixed(4), q.y.toFixed(4), q.z.toFixed(4)].join('|');
    })
    .sort()
    .join('\n');

/** merged sub-voxel boxes per full set (one detail() call = one box = +12 tris) */
const DETAIL_BOXES: Record<string, number> = {
  nomad: 40, raider: 47, guardian: 48, scout: 45, plate: 41,
  marauder: 40, bloodreaver: 51, brutehide: 45,
};
const isEnemy = (id: string) => (ENEMY_ARMOR_SET_IDS as readonly string[]).includes(id);
const build = (rig: CharacterRig, id: string, opts?: { detail?: boolean; geo?: VoxelGeoCache }) => {
  if (isEnemy(id)) applyEnemyArmor(rig, id, opts);
  else applyVoxelArmor(rig, id, opts);
};

describe('phase2: detail subdivision per set', () => {
  it('every villager set merges its exact sub-box count (+12 tris each)', () => {
    for (const id of Object.keys(VOXEL_ARMOR_SETS)) {
      const on = rigOf(31); build(on, id);
      const off = rigOf(31); build(off, id, { detail: false });
      expect(armorTris(on) - armorTris(off), `${id} detail tris`).toBe(DETAIL_BOXES[id] * 12);
      on.dispose(); off.dispose();
    }
  });
  it('every enemy set merges its exact sub-box count (+12 tris each)', () => {
    for (const id of ENEMY_ARMOR_SET_IDS) {
      const on = rigOf(31); build(on, id);
      const off = rigOf(31); build(off, id, { detail: false });
      expect(armorTris(on) - armorTris(off), `${id} detail tris`).toBe(DETAIL_BOXES[id] * 12);
      on.dispose(); off.dispose();
    }
  });
  it('detail adds zero meshes: armor census and total mesh count are identical on/off', () => {
    for (const id of [...Object.keys(VOXEL_ARMOR_SETS), ...ENEMY_ARMOR_SET_IDS]) {
      const on = rigOf(31); build(on, id);
      const off = rigOf(31); build(off, id, { detail: false });
      expect(armorMeshes(on).length, `${id} armor census`).toBe(armorMeshes(off).length);
      expect(meshCount(on), `${id} total meshes`).toBe(meshCount(off));
      on.dispose(); off.dispose();
    }
  });
  it('detail:false builds the base set only (plain boxes, 12 tris each)', () => {
    for (const id of ['nomad', 'guardian', 'bloodreaver'] as const) {
      const rig = rigOf(31);
      build(rig, id, { detail: false });
      expect(armorMeshes(rig).length).toBeGreaterThan(8);
      for (const m of armorMeshes(rig)) {
        // cones (enemy spikes) are the only non-box primaries: 10 tris
        expect([10, 12], `${id} base primaries stay unsubdivided`).toContain(tris(m));
      }
      rig.dispose();
    }
  });
  it('detail rides the slot contract (legs-only build carries its own detail)', () => {
    const on = rigOf(31); applyVoxelArmorSlot(on, 'legs', 'nomad');
    const off = rigOf(31); applyVoxelArmorSlot(off, 'legs', 'nomad', { detail: false });
    expect(armorTris(on) - armorTris(off), 'greaves detail tris').toBe(10 * 12);
    expect(armorMeshes(on).length).toBe(armorMeshes(off).length);
    on.dispose(); off.dispose();
  });
});

describe('phase2: bucket-neutral construction', () => {
  it('merged geometries keep a parameters object and stay deterministic', () => {
    for (const id of ['nomad', 'guardian', 'brutehide'] as const) {
      const a = rigOf(41); const b = rigOf(41);
      build(a, id); build(b, id);
      for (const m of armorMeshes(a)) {
        const p = (m.geometry as THREE.BoxGeometry).parameters as { width: number; height: number; depth: number; radius?: number } | undefined;
        if (p?.radius !== undefined) continue; // cone spikes: native cone parameters, never merged
        expect(p, `${id} merged geometry keeps parameters`).toBeDefined();
        expect(p!.width).toBeGreaterThan(0);
        expect(p!.height).toBeGreaterThan(0);
        expect(p!.depth).toBeGreaterThan(0);
      }
      expect(armorSig(a), `${id} detail deterministic`).toBe(armorSig(b));
      expect(armorTris(a)).toBe(armorTris(b));
      a.dispose(); b.dispose();
    }
  });
  it('shared VoxelGeoCache: base boxes share one geometry across rigs; no cache keeps the old per-piece path', () => {
    const geo = new VoxelGeoCache();
    const a = rigOf(37); applyVoxelArmor(a, 'nomad', { detail: false, geo });
    const b = rigOf(37); applyVoxelArmor(b, 'nomad', { detail: false, geo });
    const ga = armorMeshes(a).map((m) => m.geometry);
    const gb = armorMeshes(b).map((m) => m.geometry);
    expect(ga.some((g) => gb.includes(g)), 'cached geometries shared').toBe(true);
    a.dispose(); b.dispose();
    const c = rigOf(37); applyVoxelArmor(c, 'nomad', { detail: false });
    const d = rigOf(37); applyVoxelArmor(d, 'nomad', { detail: false });
    const gc = armorMeshes(c).map((m) => m.geometry);
    const gd = armorMeshes(d).map((m) => m.geometry);
    expect(gc.some((g) => gd.includes(g)), 'uncached geometries stay per-piece').toBe(false);
    c.dispose(); d.dispose();
  });
  it('detail with a shared cache: same-seed rigs build content-identical merged geometry', () => {
    const geo = new VoxelGeoCache();
    const a = rigOf(37); applyVoxelArmor(a, 'nomad', { geo });
    const b = rigOf(37); applyVoxelArmor(b, 'nomad', { geo });
    expect(armorSig(a)).toBe(armorSig(b));
    expect(armorTris(a)).toBe(armorTris(b));
    a.dispose(); b.dispose();
  });
  it('detail survives animation and clears with its parent', () => {
    const rig = rigOf(43);
    applyVoxelArmor(rig, 'guardian');
    const before = armorTris(rig);
    expect(before).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) rig.animate(i * 0.016, 2.0);
    rig.swing();
    for (let i = 0; i < 60; i++) rig.animate(i * 0.016, 0.5);
    expect(armorTris(rig), 'no detail lost').toBe(before);
    clearVoxelArmor(rig);
    expect(armorMeshes(rig)).toHaveLength(0);
    applyVoxelArmor(rig, 'guardian');
    expect(armorTris(rig), 're-apply restores detail').toBe(before);
    rig.dispose();
  });
});

describe('phase2: visor-slit variants', () => {
  /** extra slit segments per set (each +12 tris on the head glow mesh) */
  const GLOW_SEGMENTS: Record<string, number> = {
    nomad: 0, raider: 1, guardian: 2, scout: 2, plate: 1,
    marauder: 0, bloodreaver: 1, brutehide: 2,
  };
  it('each set builds its variant segment count on the set glow material', () => {
    for (const [id, n] of Object.entries(GLOW_SEGMENTS)) {
      const rig = rigOf(47);
      build(rig, id);
      // head slot only: the emblem crossbar (torso, also glow) is not a visor segment
      const headGlow = armorMeshes(rig).filter((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        return m.userData.armorSlot === 'head' && mat.emissiveIntensity > 1;
      });
      expect(headGlow.length, `${id} one head glow mesh`).toBe(1);
      const slit = headGlow[0];
      expect(tris(slit), `${id} slit tris`).toBe(12 + n * 12);
      const mat = slit.material as THREE.MeshStandardMaterial;
      const hex = '#' + mat.emissive.getHexString();
      if (isEnemy(id)) {
        expect(isEmberHex(hex), `${id} ember visor ${hex}`).toBe(true);
      } else {
        expect(isEmberHex(hex), `${id} villager visor must not read ember: ${hex}`).toBe(false);
      }
      expect(mat.emissiveIntensity, `${id} slit intensity`).toBe(VOXEL_ARMOR_SETS[id]?.visor.intensity
        ?? ({ marauder: 2.8, bloodreaver: 2.8, brutehide: 3.0 } as Record<string, number>)[id]);
      rig.dispose();
    }
  });
});
