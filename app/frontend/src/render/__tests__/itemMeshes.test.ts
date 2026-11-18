// HALLWAKE — 3D item mesh gate (3D item pass). Every ItemKind's world
// silhouette must be ONE merged BufferGeometry (so each pile is exactly one
// draw), carry real vertices, sit on the floor centred on the origin (the
// scene spins it about its own centre), bake token colors into vertex
// colors, and be deterministic — no Math.random in the source. It also
// proves buildRoomGroup swaps the old stamped crate quad for the pile mesh
// WITHOUT changing the per-room draw count (loot rooms stay at 7).
// Headless: the canvas is stubbed exactly like entityMeshes.test.

import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { doorDef } from '../../core/schedule';
import { WORLD_ITEM_KINDS, worldItemGeometry, worldItemTriangles } from '../itemMeshes';
import { buildRoomGroup, createSharedMaterials, disposeRoomGroup, roomPlanFor } from '../roomBuilder';

interface PaintImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function makeStubCtx(): unknown {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'createImageData') {
          return (w: number, h: number): PaintImage => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          });
        }
        if (prop === 'putImageData') return (): void => undefined;
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => undefined;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).document = {
    documentElement: {},
    createElement: () => ({ width: 0, height: 0, getContext: () => makeStubCtx() }),
  };
});

describe('worldItemGeometry: one merged geometry per kind (1 draw)', () => {
  for (const kind of WORLD_ITEM_KINDS) {
    it(`${kind}: single indexed BufferGeometry with real vertices + vertex colors`, () => {
      const g = worldItemGeometry(kind);
      expect(g).toBeInstanceOf(THREE.BufferGeometry);
      const pos = g.getAttribute('position');
      expect(pos).toBeDefined();
      expect(pos.count).toBeGreaterThan(0);
      expect(g.index).not.toBeNull(); // merged primitives stay indexable
      expect(g.getAttribute('color')).toBeDefined(); // token colors are vertex-baked
      const tris = (g.index as THREE.BufferAttribute).count / 3;
      expect(tris).toBeGreaterThan(0);
      expect(tris).toBeLessThanOrEqual(256); // chunky but cheap: far under the tri budget
      expect(worldItemTriangles(kind)).toBe(tris); // budget.ts counts the real mesh
      g.dispose();
    });

    it(`${kind}: deterministic — two builds are byte-identical (no RNG)`, () => {
      const a = worldItemGeometry(kind);
      const b = worldItemGeometry(kind);
      const pa = (a.getAttribute('position') as THREE.BufferAttribute).array;
      const pb = (b.getAttribute('position') as THREE.BufferAttribute).array;
      expect(pa.length).toBe(pb.length);
      expect(Array.from(pa)).toEqual(Array.from(pb));
      a.dispose();
      b.dispose();
    });

    it(`${kind}: sits on the floor, centred on the origin (spins about itself)`, () => {
      const g = worldItemGeometry(kind);
      const bb = g.boundingBox!;
      expect(bb.min.y).toBeCloseTo(0, 6);
      expect(Math.abs((bb.min.x + bb.max.x) / 2)).toBeLessThanOrEqual(0.12);
      expect(Math.abs((bb.min.z + bb.max.z) / 2)).toBeLessThanOrEqual(0.05);
      expect(bb.max.y).toBeGreaterThan(0.03); // real height: reads as an object
      expect(bb.max.y).toBeLessThanOrEqual(0.45); // small enough for booth distance
      g.dispose();
    });
  }

  it('every kind is its own silhouette (distinct vertex counts)', () => {
    const counts = WORLD_ITEM_KINDS.map((k) => {
      const g = worldItemGeometry(k);
      const n = (g.getAttribute('position') as THREE.BufferAttribute).count;
      g.dispose();
      return n;
    });
    expect(new Set(counts).size).toBe(WORLD_ITEM_KINDS.length);
  });

  it('itemMeshes.ts contains no Math.random (geometry is authored arithmetic)', () => {
    const src = readFileSync(join(__dirname, '..', 'itemMeshes.ts'), 'utf8');
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });
});

describe('buildRoomGroup: the pile mesh replaces the crate quad draw', () => {
  it('loot door (2, TONIC): exactly 7 draws, one of them the 3D pile mesh', () => {
    const mats = createSharedMaterials('mid');
    const plan = roomPlanFor(doorDef(2));
    expect(plan.drawCalls).toBe(7);
    const room = buildRoomGroup(plan, 'mid', mats);
    const draws = room.group.children.filter((c) => c instanceof THREE.Mesh).length;
    expect(draws).toBe(plan.drawCalls); // every child is one draw; the pile adds none
    expect(room.lootMesh).not.toBeNull();
    const pg = room.lootMesh!.geometry;
    expect(pg.getAttribute('color')).toBeDefined();
    expect((pg.getAttribute('position') as THREE.BufferAttribute).count).toBeGreaterThan(0);
    expect(room.lootMesh!.position.x).toBe(plan.lootQuad!.x);
    expect(room.lootMesh!.position.z).toBe(plan.lootQuad!.z);
    disposeRoomGroup(room);
  });

  it('non-loot door (1): no pile mesh, still 6 draws', () => {
    const mats = createSharedMaterials('mid');
    const plan = roomPlanFor(doorDef(1));
    expect(plan.drawCalls).toBe(6);
    const room = buildRoomGroup(plan, 'mid', mats);
    const draws = room.group.children.filter((c) => c instanceof THREE.Mesh).length;
    expect(draws).toBe(6);
    expect(room.lootMesh).toBeNull();
    disposeRoomGroup(room);
  });
});
