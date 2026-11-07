/**
 * PHASE2 (shard visual identity): the collect-stage pickups are the quest
 * shards, so the 'coin' kind renders as an elongated amber crystal — same
 * shared '#ffd23f' glow material the asset registry pins, geometry only.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Pickups } from '../src/engine/game/Pickups';
import { Rng } from '../src/engine/core/Rng';

function mockEngine() {
  const cache = new Map<string, THREE.Material>();
  return {
    rng: new Rng(99),
    scene: { add() {}, remove() {} },
    mats: {
      glow: (hex: string, intensity = 1) => {
        const key = `${hex}:${intensity}`;
        if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color: hex }));
        return cache.get(key)!;
      },
    },
    particles: { magic() {} },
    hooks: { emit() {} },
  };
}

function firstMesh(root: THREE.Object3D): THREE.Mesh {
  let out: THREE.Mesh | null = null;
  root.traverse((o) => { if (!out && (o as THREE.Mesh).isMesh) out = o as THREE.Mesh; });
  return out!;
}

describe('phase2 shard visual', () => {
  it('renders coin pickups as elongated octahedron shards, not cylinders', () => {
    const pickups = new Pickups(mockEngine() as any);
    pickups.spawn('coin', new THREE.Vector3(0, 1, 0));
    const mesh = firstMesh(pickups.list[0].mesh);
    expect(mesh.geometry.type).toBe('OctahedronGeometry');
    // crystal elongation: taller than it is wide
    expect(mesh.scale.y).toBeGreaterThan(mesh.scale.x);
  });

  it('keeps the shared pinned #ffd23f glow across shard pickups', () => {
    const pickups = new Pickups(mockEngine() as any);
    pickups.spawn('coin', new THREE.Vector3(0, 1, 0));
    pickups.spawn('coin', new THREE.Vector3(2, 1, 0));
    const a = firstMesh(pickups.list[0].mesh).material as THREE.MeshStandardMaterial;
    const b = firstMesh(pickups.list[1].mesh).material as THREE.MeshStandardMaterial;
    expect(b).toBe(a); // cache shared, like the real library
    expect('#' + a.color.getHexString()).toBe('#ffd23f');
  });
});
