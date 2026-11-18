// HALLWAKE — the fixed 24-door table (architecture.md §4). Identical every
// run: this table IS the thesis ("learnable horror, no unreadable RNG").
// All per-door variation is authored data here; the sim adds no randomness.

import type { ItemType } from './types';

export type Archetype = 'junction' | 'guest' | 'laundry' | 'lounge' | 'boiler' | 'washroom';
export type Variant = 'A' | 'B';
export type DoorEvent = 'GAUNT' | 'MURMUR' | 'TALLY' | 'CINDER' | 'FINALE';

export interface DoorDef {
  door: number; // 1..24
  archetype: Archetype;
  variant: Variant;
  event: DoorEvent | null;
  checkpoint: boolean;
  gaunt?: { alcoveIndex: number; tellTick: number; waypoints: [[number, number], [number, number]] };
  cinderOrder?: number[]; // sconce relight scratch order, indices 0..2
  murmurSpawn?: { x: number; z: number };
  tallyFakeNum?: number; // fake door numeral = expected + 2
  // --- Wave 1 authored extras (features.md): all deterministic table data ---
  loot?: ItemType; // this room's kit pile (at archetypeGeom loot anchor)
  coins?: number; // this room's coin pile (at archetypeGeom coins anchor)
  locked?: boolean; // exit door needs a PICK from the kit
  closet?: AABB; // enterable hide rect (distinct from the alcove nooks)
}

export interface AABB {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface ArchetypeGeom {
  colliders: AABB[];
  alcoves: AABB[]; // 3 alcove nooks, pale-paint GAUNT hiding spots
  sconces: { x: number; z: number }[]; // 3 wall sconces (CINDER rooms)
  oilCan: { x: number; z: number };
  loot: { x: number; z: number }; // Wave 1: where an authored loot pile sits
  coins: { x: number; z: number }; // Wave 1: where an authored coin pile sits
}

// Room frame: 14 x 10 m, entry south-center, exit door north-center.
export const ROOM_W = 14;
export const ROOM_D = 10;
export const ENTRY = { x: 7, z: 1.5 };
export const EXIT_DOOR = { x: 7, z: 10 };
export const INTERACT_RANGE = 1.6;
export const FAKE_DOOR_POS = { x: 10.5, z: 9.6 };

export const CHECKPOINT_DOORS = [1, 5, 9, 13, 17, 21];

// Alcove slots are identical across archetypes (shared nav points, §4).
const ALCOVES: AABB[] = [
  { x0: 0.2, x1: 1.6, z0: 0.6, z1: 2.6 }, // idx 0: west, near entry
  { x0: 12.4, x1: 13.8, z0: 0.6, z1: 2.6 }, // idx 1: east, near entry
  { x0: 0.2, x1: 1.6, z0: 7.4, z1: 9.4 }, // idx 2: west, far
];

const GEOM: Record<Archetype, ArchetypeGeom> = {
  junction: {
    colliders: [
      { x0: 4, x1: 6, z0: 4, z1: 6 },
      { x0: 8, x1: 10, z0: 4, z1: 6 },
    ],
    alcoves: ALCOVES,
    sconces: [
      { x: 2, z: 4 },
      { x: 7, z: 6 },
      { x: 12, z: 4 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
  guest: {
    colliders: [{ x0: 3, x1: 6, z0: 6, z1: 8.5 }],
    alcoves: ALCOVES,
    sconces: [
      { x: 2, z: 4 },
      { x: 7, z: 6 },
      { x: 12, z: 4 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
  laundry: {
    colliders: [
      { x0: 2, x1: 4, z0: 6.5, z1: 9 },
      { x0: 10, x1: 12, z0: 6.5, z1: 9 },
    ],
    alcoves: ALCOVES,
    sconces: [
      { x: 2, z: 4 },
      { x: 7, z: 6 },
      { x: 12, z: 4 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
  lounge: {
    colliders: [
      { x0: 4, x1: 7, z0: 6, z1: 7.5 },
      { x0: 8.5, x1: 11, z0: 6, z1: 7.5 },
    ],
    alcoves: ALCOVES,
    sconces: [
      { x: 2, z: 4 },
      { x: 7, z: 6 },
      { x: 12, z: 4 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
  boiler: {
    colliders: [{ x0: 5.5, x1: 8.5, z0: 6.5, z1: 8 }],
    alcoves: ALCOVES,
    // boiler A sconces (doors 9, 21); boiler B uses BOILER_B_SCONCES below.
    sconces: [
      { x: 2, z: 3 },
      { x: 7, z: 5 },
      { x: 12, z: 3 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
  washroom: {
    colliders: [
      { x0: 2, x1: 3.5, z0: 7, z1: 9 },
      { x0: 10.5, x1: 12, z0: 7, z1: 9 },
    ],
    alcoves: ALCOVES,
    sconces: [
      { x: 2, z: 4 },
      { x: 7, z: 6 },
      { x: 12, z: 4 },
    ],
    oilCan: { x: 12.5, z: 8.5 },
    loot: { x: 12, z: 3 },
    coins: { x: 7, z: 3 },
  },
};

// Variant B boiler rooms mirror the sconce anchors (door 15, 24).
export const BOILER_B_SCONCES = [
  { x: 10, z: 2 },
  { x: 13, z: 6 },
  { x: 12, z: 4 },
];

export function archetypeGeom(a: Archetype): ArchetypeGeom {
  return GEOM[a];
}

export function sconcePositions(def: DoorDef): { x: number; z: number }[] {
  return def.variant === 'B' && def.archetype === 'boiler' ? BOILER_B_SCONCES : GEOM[def.archetype].sconces;
}

// The exact 24-door table from architecture.md §4.
export const SCHEDULE: DoorDef[] = [
  { door: 1, archetype: 'junction', variant: 'A', event: null, checkpoint: true },
  { door: 2, archetype: 'guest', variant: 'A', event: null, checkpoint: false, loot: 'TONIC', coins: 3 },
  { door: 3, archetype: 'washroom', variant: 'A', event: null, checkpoint: false, coins: 2 },
  { door: 4, archetype: 'junction', variant: 'B', event: null, checkpoint: false, locked: true, loot: 'PICK' },
  {
    door: 5, archetype: 'junction', variant: 'A', event: 'TALLY', checkpoint: true,
    tallyFakeNum: 8,
  },
  { door: 6, archetype: 'laundry', variant: 'A', event: null, checkpoint: false, loot: 'FLASK', coins: 4 },
  {
    door: 7, archetype: 'guest', variant: 'A', event: 'GAUNT', checkpoint: false,
    gaunt: { alcoveIndex: 0, tellTick: 60, waypoints: [[1, 2], [13, 8]] },
    // Wave 1: an enterable closet in the far-east corner — the sweep path
    // ends at (13,8) right past its door, so hiding here is the braver
    // alternative to the west alcove.
    closet: { x0: 12.4, x1: 13.8, z0: 7.4, z1: 9.4 },
  },
  { door: 8, archetype: 'lounge', variant: 'A', event: null, checkpoint: false, loot: 'WARD', coins: 3 },
  {
    door: 9, archetype: 'boiler', variant: 'A', event: 'CINDER', checkpoint: true,
    cinderOrder: [0, 1, 2],
  },
  {
    door: 10, archetype: 'laundry', variant: 'B', event: 'MURMUR', checkpoint: false,
    murmurSpawn: { x: 1, z: 9 },
  },
  { door: 11, archetype: 'guest', variant: 'B', event: null, checkpoint: false, loot: 'TONIC', coins: 2 },
  {
    door: 12, archetype: 'junction', variant: 'B', event: 'TALLY', checkpoint: false,
    tallyFakeNum: 15,
  },
  {
    door: 13, archetype: 'guest', variant: 'A', event: 'GAUNT', checkpoint: true,
    // Alcove 1 (east, near entry): waypoint (13,2) sits inside it, so the
    // GAUNT steps out of the very nook you hide in — the door-7 pattern,
    // mirrored and escalated (checkpoint door). The sweep ends at (1,8),
    // inside the far alcove 2: the tempting far nook is the trap, not the
    // hiding spot. Alcove 2 was unreachable at tellTick 60 (7.998 m from
    // ENTRY vs 7.517 m travel budget) — see the reachability invariant in
    // schedule.test.ts.
    gaunt: { alcoveIndex: 1, tellTick: 60, waypoints: [[13, 2], [1, 8]] },
    // Wave 1: far-east closet — the one nook the sweep never enters.
    closet: { x0: 12.4, x1: 13.8, z0: 7.4, z1: 9.4 },
  },
  { door: 14, archetype: 'washroom', variant: 'B', event: null, checkpoint: false, locked: true, loot: 'PICK' },
  {
    door: 15, archetype: 'boiler', variant: 'B', event: 'CINDER', checkpoint: false,
    cinderOrder: [2, 0, 1],
  },
  {
    door: 16, archetype: 'laundry', variant: 'A', event: 'MURMUR', checkpoint: false,
    murmurSpawn: { x: 13, z: 9 },
  },
  { door: 17, archetype: 'lounge', variant: 'B', event: null, checkpoint: true, loot: 'FLASK', coins: 5 },
  {
    door: 18, archetype: 'junction', variant: 'A', event: 'TALLY', checkpoint: false,
    tallyFakeNum: 21,
  },
  {
    door: 19, archetype: 'guest', variant: 'B', event: 'GAUNT', checkpoint: false,
    gaunt: { alcoveIndex: 1, tellTick: 60, waypoints: [[1, 8], [13, 2]] },
    // Wave 1: far-east closet, mirroring doors 7/13.
    closet: { x0: 12.4, x1: 13.8, z0: 7.4, z1: 9.4 },
  },
  { door: 20, archetype: 'washroom', variant: 'A', event: null, checkpoint: false, coins: 3 },
  {
    door: 21, archetype: 'boiler', variant: 'A', event: 'CINDER', checkpoint: true,
    cinderOrder: [1, 2, 0],
  },
  {
    door: 22, archetype: 'laundry', variant: 'B', event: 'MURMUR', checkpoint: false,
    murmurSpawn: { x: 1, z: 9 },
  },
  { door: 23, archetype: 'lounge', variant: 'A', event: null, checkpoint: false, loot: 'WARD', coins: 4 },
  {
    door: 24, archetype: 'boiler', variant: 'B', event: 'FINALE', checkpoint: false,
    cinderOrder: [0, 2, 1],
    // finale GAUNT tell is delayed to roomTick 300 (architecture.md §5)
    gaunt: { alcoveIndex: 1, tellTick: 300, waypoints: [[1, 3], [13, 7]] },
  },
];

export function doorDef(door: number): DoorDef {
  const d = SCHEDULE[door - 1];
  if (!d) throw new Error(`door out of range: ${door}`);
  return d;
}
