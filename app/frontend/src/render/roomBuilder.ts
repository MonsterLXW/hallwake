// HALLWAKE — room archetype geometry (architecture.md §3/§4). Authored as
// pure data first (roomPlanFor) so budget.ts can count the scene without
// WebGL; buildRoomGroup turns a plan into merged THREE meshes:
//   StaticMerged (walls+floor+ceiling, atlas UVs, vertex-AO shading) = 1 draw
//   PropsMerged (furniture + oil can)                                = 1 draw
//   DoorMesh (canvas numeral)                                        = 1 draw
//   Sconces / Alcoves / BlobAO as InstancedMesh                      = 1 draw each
//   TALLY fake door (when the door has one)                          = 1 draw
// Variant B mirrors the prop plan across x; nav points (alcoves, sconces,
// exit) stay schedule-identical so entity paths never move.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Archetype, DoorDef } from '../core/schedule';
import { FAKE_DOOR_POS, archetypeGeom, sconcePositions } from '../core/schedule';
import {
  ATLAS_CELLS,
  atlasCellUV,
  getAtlas,
  getEmissiveTexture,
  getNumeralTexture,
  type AtlasCell,
} from './textures';
import type { Quality } from './quality';

export const ROOM_H = 3;
const WALL_T = 0.2;
const DOOR_GAP = 1.4; // exit/entry gap centred on x=7
const DISC_SEG = 10;

export interface BoxSpec {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
}
export interface QuadSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY: number;
}
export interface DiscSpec {
  x: number;
  z: number;
  r: number;
}

export interface RoomPlan {
  door: number;
  archetype: Archetype;
  variant: 'A' | 'B';
  wallBoxes: BoxSpec[];
  propBoxes: BoxSpec[];
  aoDiscs: DiscSpec[];
  sconceQuads: QuadSpec[];
  alcoveQuads: QuadSpec[];
  doorQuad: QuadSpec;
  fakeDoorQuad: QuadSpec | null;
  drawCalls: number;
  triangles: number;
}

const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): BoxSpec => ({ cx, cy, cz, sx, sy, sz });

// Furniture footprints come from the core collider table (props ARE the
// colliders) plus a little non-colliding decor per archetype mood (brief §8).
function propBoxesFor(a: Archetype): BoxSpec[] {
  const cols = archetypeGeom(a).colliders;
  const out: BoxSpec[] = [];
  for (const c of cols) {
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    const sx = c.x1 - c.x0;
    const sz = c.z1 - c.z0;
    switch (a) {
      case 'junction':
        out.push(box(cx, 0.55, cz, sx, 1.1, sz)); // crate stacks
        break;
      case 'guest':
        out.push(box(cx, 0.3, cz, sx, 0.6, sz)); // single bed
        out.push(box(cx, 0.5, c.z1 + 0.1, sx, 1.0, 0.18)); // headboard
        break;
      case 'laundry':
        out.push(box(cx, 0.9, cz, sx, 1.8, sz)); // shelving
        break;
      case 'lounge':
        out.push(box(cx, 0.4, cz, sx, 0.8, sz)); // dead armchairs
        break;
      case 'boiler':
        out.push(box(cx, 0.8, cz, sx, 1.6, sz)); // boiler block
        out.push(box(cx - 0.8, 1.2, cz, 0.35, 2.4, 0.35)); // pipe tangle
        out.push(box(cx + 0.8, 1.2, cz, 0.35, 2.4, 0.35));
        break;
      case 'washroom':
        out.push(box(cx, 0.45, cz, sx, 0.9, sz)); // porcelain basins
        break;
    }
  }
  if (a === 'lounge') out.push(box(12.6, 0.5, 9.3, 1.6, 1.0, 0.8)); // cold hearth
  const can = archetypeGeom(a).oilCan;
  out.push(box(can.x, 0.18, can.z, 0.3, 0.36, 0.3)); // oil can prop
  return out;
}

function wallBoxes(): BoxSpec[] {
  const g0 = 7 - DOOR_GAP / 2;
  const g1 = 7 + DOOR_GAP / 2;
  const seg = (x0: number, x1: number, z: number): BoxSpec =>
    box((x0 + x1) / 2, ROOM_H / 2, z, x1 - x0, ROOM_H, WALL_T);
  return [
    seg(0, g0, -WALL_T / 2), // south, entry gap
    seg(g1, 14, -WALL_T / 2),
    box(7, 2.55, -WALL_T / 2, DOOR_GAP, ROOM_H - 2.1, WALL_T), // entry lintel
    seg(0, g0, 10 + WALL_T / 2), // north, exit gap
    seg(g1, 14, 10 + WALL_T / 2),
    box(7, 2.55, 10 + WALL_T / 2, DOOR_GAP, ROOM_H - 2.1, WALL_T), // exit lintel
    box(-WALL_T / 2, ROOM_H / 2, 5, WALL_T, ROOM_H, 10 + WALL_T * 2), // west
    box(14 + WALL_T / 2, ROOM_H / 2, 5, WALL_T, ROOM_H, 10 + WALL_T * 2), // east
  ];
}

function sconceQuadsFor(def: DoorDef): QuadSpec[] {
  return sconcePositions(def).map((s) => {
    if (s.x <= 2) return { x: 0.06, y: 1.8, z: s.z, w: 0.5, h: 0.7, rotY: Math.PI / 2 };
    if (s.x >= 12) return { x: 13.94, y: 1.8, z: s.z, w: 0.5, h: 0.7, rotY: -Math.PI / 2 };
    return { x: s.x, y: 1.8, z: s.z - 0.06, w: 0.5, h: 0.7, rotY: Math.PI };
  });
}

function alcoveQuadsFor(a: Archetype): QuadSpec[] {
  const al = archetypeGeom(a).alcoves;
  return al.map((n) => {
    const west = (n.x0 + n.x1) / 2 < 7;
    const cz = (n.z0 + n.z1) / 2;
    return west
      ? { x: 0.06, y: 1.1, z: cz, w: 1.4, h: 2.2, rotY: Math.PI / 2 }
      : { x: 13.94, y: 1.1, z: cz, w: 1.4, h: 2.2, rotY: -Math.PI / 2 };
  });
}

export function roomPlanFor(def: DoorDef): RoomPlan {
  const props = propBoxesFor(def.archetype);
  if (def.variant === 'B') {
    for (const p of props) p.cx = 14 - p.cx; // mirrored plan, same nav points
  }
  const geom = archetypeGeom(def.archetype);
  const aoDiscs: DiscSpec[] = props.map((p) => ({
    x: p.cx,
    z: p.cz,
    r: Math.max(p.sx, p.sz) * 0.65,
  }));
  for (const n of geom.alcoves) aoDiscs.push({ x: (n.x0 + n.x1) / 2, z: (n.z0 + n.z1) / 2, r: 0.8 });
  aoDiscs.push({ x: 7, z: 9.6, r: 0.9 });

  const hasFake = def.tallyFakeNum !== undefined;
  const wall = wallBoxes();
  const sconces = sconceQuadsFor(def);
  const alcoves = alcoveQuadsFor(def.archetype);

  const triangles =
    wall.length * 12 + // walls
    2 * 2 + // floor + ceiling quads
    props.length * 12 +
    aoDiscs.length * DISC_SEG +
    sconces.length * 2 +
    alcoves.length * 2 +
    2 + // door
    (hasFake ? 2 : 0);

  const drawCalls =
    1 + // StaticMerged
    1 + // PropsMerged
    1 + // DoorMesh
    1 + // sconce instances
    1 + // alcove instances
    1 + // blob-AO instances
    (hasFake ? 1 : 0);

  return {
    door: def.door,
    archetype: def.archetype,
    variant: def.variant,
    wallBoxes: wall,
    propBoxes: props,
    aoDiscs,
    sconceQuads: sconces,
    alcoveQuads: alcoves,
    doorQuad: { x: 7, y: 1.05, z: 9.78, w: DOOR_GAP, h: 2.1, rotY: Math.PI },
    fakeDoorQuad: hasFake ? { x: FAKE_DOOR_POS.x, y: 1.05, z: 9.72, w: DOOR_GAP, h: 2.1, rotY: Math.PI } : null,
    drawCalls,
    triangles,
  };
}

// ---- THREE construction ---------------------------------------------------

export interface SharedMaterials {
  staticMat: THREE.MeshLambertMaterial;
  propsMat: THREE.MeshLambertMaterial;
  sconceMat: THREE.MeshBasicMaterial;
  alcoveMat: THREE.MeshBasicMaterial;
  aoMat: THREE.MeshBasicMaterial;
}

export function createSharedMaterials(quality: Quality): SharedMaterials {
  const wallTex = getAtlas(quality);
  return {
    staticMat: new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true }),
    propsMat: new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true }),
    // Quads are flat planes; DoubleSide so sconces/alcoves/AO never vanish when
    // the player turns around or views them from behind (walls/props are solid
    // boxes and stay FrontSide).
    sconceMat: new THREE.MeshBasicMaterial({ map: getEmissiveTexture('sconce'), side: THREE.DoubleSide }),
    alcoveMat: new THREE.MeshBasicMaterial({ map: getEmissiveTexture('alcove'), side: THREE.DoubleSide }),
    aoMat: new THREE.MeshBasicMaterial({
      map: getEmissiveTexture('ao'),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}

function retileUV(geo: THREE.BufferGeometry, cell: AtlasCell, quality: Quality): void {
  const { u0, v0, u1, v1 } = atlasCellUV(cell, quality);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
  }
  uv.needsUpdate = true;
}

// "baked look" vertex trick: darken geometry near floor and ceiling so rooms
// read as pre-lit even before the lantern touches them (architecture §3).
function shadeByHeight(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.min(1, Math.max(0, y / ROOM_H));
    const s = 0.66 + 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    colors[i * 3] = s;
    colors[i * 3 + 1] = s;
    colors[i * 3 + 2] = s;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function boxGeo(b: BoxSpec): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
  g.translate(b.cx, b.cy, b.cz);
  return g;
}

export interface RoomMeshes {
  group: THREE.Group;
  doorMat: THREE.MeshBasicMaterial;
  fakeDoorMesh: THREE.Mesh | null;
  sconceInst: THREE.InstancedMesh;
  aoInst: THREE.InstancedMesh;
}

const dummy = new THREE.Object3D();

export function buildRoomGroup(plan: RoomPlan, quality: Quality, mats: SharedMaterials): RoomMeshes {
  const group = new THREE.Group();

  // --- StaticMerged: walls (plaster) + floor (wood) + ceiling (lightmap) ---
  const staticGeos: THREE.BufferGeometry[] = [];
  for (const b of plan.wallBoxes) {
    const g = boxGeo(b);
    retileUV(g, ATLAS_CELLS.plaster, quality);
    shadeByHeight(g);
    staticGeos.push(g);
  }
  const floor = new THREE.PlaneGeometry(14, 10);
  floor.rotateX(-Math.PI / 2);
  retileUV(floor, ATLAS_CELLS.wood, quality);
  shadeByHeight(floor);
  staticGeos.push(floor);
  const ceil = new THREE.PlaneGeometry(14, 10);
  ceil.rotateX(Math.PI / 2);
  ceil.translate(0, ROOM_H, 5);
  retileUV(ceil, ATLAS_CELLS.lightmap, quality);
  shadeByHeight(ceil);
  staticGeos.push(ceil);
  const staticMerged = mergeGeometries(staticGeos);
  for (const g of staticGeos) g.dispose();
  group.add(new THREE.Mesh(staticMerged, mats.staticMat));

  // --- PropsMerged ---
  const propGeos = plan.propBoxes.map((b) => {
    const g = boxGeo(b);
    retileUV(g, ATLAS_CELLS.plaster, quality);
    shadeByHeight(g);
    return g;
  });
  const propsMerged = mergeGeometries(propGeos);
  for (const g of propGeos) g.dispose();
  group.add(new THREE.Mesh(propsMerged, mats.propsMat));

  // --- DoorMesh (stenciled numeral, always legible: unlit basic material) ---
  const doorMat = new THREE.MeshBasicMaterial({ map: getNumeralTexture(plan.door), side: THREE.DoubleSide });
  const dq = plan.doorQuad;
  const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(dq.w, dq.h), doorMat);
  doorMesh.position.set(dq.x, dq.y, dq.z);
  doorMesh.rotation.y = dq.rotY;
  group.add(doorMesh);

  // --- TALLY fake door (spawned by the sim's FAKE phase; mesh always built) ---
  let fakeDoorMesh: THREE.Mesh | null = null;
  if (plan.fakeDoorQuad) {
    const fq = plan.fakeDoorQuad;
    fakeDoorMesh = new THREE.Mesh(new THREE.PlaneGeometry(fq.w, fq.h), doorMat);
    fakeDoorMesh.position.set(fq.x, fq.y, fq.z);
    fakeDoorMesh.rotation.y = fq.rotY;
    fakeDoorMesh.visible = false;
    group.add(fakeDoorMesh);
  }

  // --- Sconces: instanced emissive quads (not lights — budget §3) ---
  const sconceInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    mats.sconceMat,
    plan.sconceQuads.length,
  );
  plan.sconceQuads.forEach((q, i) => {
    dummy.position.set(q.x, q.y, q.z);
    dummy.rotation.set(0, q.rotY, 0);
    dummy.scale.set(q.w, q.h, 1);
    dummy.updateMatrix();
    sconceInst.setMatrixAt(i, dummy.matrix);
    sconceInst.setColorAt(i, new THREE.Color(1, 1, 1));
  });
  sconceInst.instanceMatrix.needsUpdate = true;
  if (sconceInst.instanceColor) sconceInst.instanceColor.needsUpdate = true;
  group.add(sconceInst);

  // --- Alcoves: instanced pale-paint trim (GAUNT hide spots) ---
  const alcoveInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    mats.alcoveMat,
    plan.alcoveQuads.length,
  );
  plan.alcoveQuads.forEach((q, i) => {
    dummy.position.set(q.x, q.y, q.z);
    dummy.rotation.set(0, q.rotY, 0);
    dummy.scale.set(q.w, q.h, 1);
    dummy.updateMatrix();
    alcoveInst.setMatrixAt(i, dummy.matrix);
  });
  alcoveInst.instanceMatrix.needsUpdate = true;
  group.add(alcoveInst);

  // --- BlobAO: instanced dark discs under props (the "baked" contact) ---
  const aoGeo = new THREE.CircleGeometry(1, DISC_SEG);
  aoGeo.rotateX(-Math.PI / 2);
  const aoInst = new THREE.InstancedMesh(aoGeo, mats.aoMat, plan.aoDiscs.length);
  plan.aoDiscs.forEach((d, i) => {
    dummy.position.set(d.x, 0.02, d.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(d.r, 1, d.r);
    dummy.updateMatrix();
    aoInst.setMatrixAt(i, dummy.matrix);
  });
  aoInst.instanceMatrix.needsUpdate = true;
  group.add(aoInst);

  return { group, doorMat, fakeDoorMesh, sconceInst, aoInst };
}

export function disposeRoomGroup(room: RoomMeshes): void {
  room.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) obj.geometry.dispose();
  });
  room.doorMat.dispose();
  room.group.clear();
}
