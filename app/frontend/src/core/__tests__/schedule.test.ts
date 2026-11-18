// Golden assertions on the fixed 24-door schedule (architecture.md §4).
// This table IS the product thesis: identical every run, no RNG.

import { describe, it, expect } from 'vitest';
import type { AABB } from '../schedule';
import {
  SCHEDULE,
  CHECKPOINT_DOORS,
  ROOM_W,
  ROOM_D,
  ENTRY,
  EXIT_DOOR,
  INTERACT_RANGE,
  archetypeGeom,
  doorDef,
} from '../schedule';
import { GAUNT_TELL_LEAD, GAUNT_SWEEP_TICKS, GRIP_SPEED, GRIP_KILL_DIST } from '../entities';
import { WALK_SPEED } from '../sim';

describe('24-door schedule table', () => {
  it('has exactly 24 rows, doors 1..24 in order', () => {
    expect(SCHEDULE).toHaveLength(24);
    SCHEDULE.forEach((d, i) => expect(d.door).toBe(i + 1));
  });

  it('matches the fixed event schedule', () => {
    const expectEvent: Record<number, string | null> = {
      5: 'TALLY', 12: 'TALLY', 18: 'TALLY',
      7: 'GAUNT', 13: 'GAUNT', 19: 'GAUNT',
      9: 'CINDER', 15: 'CINDER', 21: 'CINDER',
      10: 'MURMUR', 16: 'MURMUR', 22: 'MURMUR',
      6: 'STARE', 14: 'STARE', 20: 'STARE',
      8: 'GRIP', 17: 'GRIP', 23: 'GRIP',
      24: 'FINALE',
    };
    for (const d of SCHEDULE) {
      expect(d.event, `door ${d.door}`).toBe(expectEvent[d.door] ?? null);
    }
  });

  it('matches the fixed archetype/variant layout', () => {
    const layout: Record<number, string> = {
      1: 'junction.A', 2: 'guest.A', 3: 'washroom.A', 4: 'junction.B',
      5: 'junction.A', 6: 'laundry.A', 7: 'guest.A', 8: 'lounge.A',
      9: 'boiler.A', 10: 'laundry.B', 11: 'guest.B', 12: 'junction.B',
      13: 'guest.A', 14: 'washroom.B', 15: 'boiler.B', 16: 'laundry.A',
      17: 'lounge.B', 18: 'junction.A', 19: 'guest.B', 20: 'washroom.A',
      21: 'boiler.A', 22: 'laundry.B', 23: 'lounge.A', 24: 'boiler.B',
    };
    for (const d of SCHEDULE) {
      expect(`${d.archetype}.${d.variant}`, `door ${d.door}`).toBe(layout[d.door]);
    }
  });

  it('checkpoints are exactly {1,5,9,13,17,21}', () => {
    expect([...CHECKPOINT_DOORS].sort((a, b) => a - b)).toEqual([1, 5, 9, 13, 17, 21]);
    for (const d of SCHEDULE) {
      expect(d.checkpoint, `door ${d.door}`).toBe(CHECKPOINT_DOORS.includes(d.door));
    }
  });

  it('GAUNT doors carry an alcove index and exactly 2 sweep waypoints', () => {
    for (const door of [7, 13, 19, 24]) {
      const g = doorDef(door).gaunt;
      expect(g, `door ${door}`).toBeTruthy();
      expect(g!.waypoints).toHaveLength(2);
      for (const [x, z] of g!.waypoints) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(ROOM_W);
        expect(z).toBeGreaterThanOrEqual(0);
        expect(z).toBeLessThanOrEqual(ROOM_D);
      }
    }
    expect(doorDef(7).gaunt!.alcoveIndex).toBe(0);
    expect(doorDef(13).gaunt!.alcoveIndex).toBe(1);
    expect(doorDef(19).gaunt!.alcoveIndex).toBe(1);
    expect(doorDef(24).gaunt!.alcoveIndex).toBe(1);
  });

  // REACHABILITY INVARIANT (T1-defect): a GAUNT door is only survivable if
  // the player can physically reach its alcove before the sweep pins them.
  // The player spawns at ENTRY at roomTick 0; the first hidden check is the
  // tick after the sweep starts (roomTick = tellTick + GAUNT_TELL_LEAD + 1),
  // and moving on that tick fails the |vel| < 0.2 test — so the last tick
  // they may move is sweepStart = tellTick + GAUNT_TELL_LEAD. Reachable
  // radius from ENTRY = WALK_SPEED * sweepStart / 60. Alcove distance is
  // point-to-AABB: a straight-line lower bound on any collider-detour path,
  // so passing this test is necessary (not sufficient) for reachability.
  // MARGIN = 1.0 m (~27 ticks) of routing slack for collider detours and
  // human imprecision at the booth.
  const REACH_MARGIN = 1.0;
  for (const door of [7, 13, 19, 24]) {
    it(`door ${door} GAUNT: alcove reachable from ENTRY with >= ${REACH_MARGIN} m slack`, () => {
      const def = doorDef(door);
      const g = def.gaunt!;
      const sweepStart = g.tellTick + GAUNT_TELL_LEAD;
      const maxTravel = (WALK_SPEED * sweepStart) / 60;
      const a = archetypeGeom(def.archetype).alcoves[g.alcoveIndex];
      const cx = Math.min(Math.max(ENTRY.x, a.x0), a.x1);
      const cz = Math.min(Math.max(ENTRY.z, a.z0), a.z1);
      const dist = Math.hypot(cx - ENTRY.x, cz - ENTRY.z);
      expect(
        dist + REACH_MARGIN,
        `door ${door}: alcove ${g.alcoveIndex} sits ${dist.toFixed(3)} m from ENTRY ` +
          `but tellTick ${g.tellTick} only allows ${maxTravel.toFixed(3)} m of travel`,
      ).toBeLessThanOrEqual(maxTravel);
    });
  }

  it('CINDER sconce relight orders are exactly the authored table', () => {
    expect(doorDef(9).cinderOrder).toEqual([0, 1, 2]);
    expect(doorDef(15).cinderOrder).toEqual([2, 0, 1]);
    expect(doorDef(21).cinderOrder).toEqual([1, 2, 0]);
    expect(doorDef(24).cinderOrder).toEqual([0, 2, 1]);
  });

  it('MURMUR doors carry a spawn corner', () => {
    for (const door of [10, 16, 22]) {
      const m = doorDef(door).murmurSpawn;
      expect(m, `door ${door}`).toBeTruthy();
      expect(m!.x).toBeGreaterThanOrEqual(0);
      expect(m!.x).toBeLessThanOrEqual(ROOM_W);
      expect(m!.z).toBeGreaterThanOrEqual(0);
      expect(m!.z).toBeLessThanOrEqual(ROOM_D);
    }
    expect(doorDef(10).murmurSpawn).toEqual({ x: 1, z: 9 });
  });

  it('TALLY fake numeral is always expected + 2 (never the log number)', () => {
    for (const door of [5, 12, 18]) {
      expect(doorDef(door).tallyFakeNum, `door ${door}`).toBe(door + 3);
    }
    expect(doorDef(5).tallyFakeNum).toBe(8);
    expect(doorDef(12).tallyFakeNum).toBe(15);
    expect(doorDef(18).tallyFakeNum).toBe(21);
  });

  it('every archetype has geometry: colliders, 3 alcoves, 3 sconces, oil can', () => {
    for (const a of ['junction', 'guest', 'laundry', 'lounge', 'boiler', 'washroom'] as const) {
      const g = archetypeGeom(a);
      expect(g.colliders.length).toBeGreaterThan(0);
      expect(g.alcoves).toHaveLength(3);
      expect(g.sconces).toHaveLength(3);
      expect(g.oilCan).toBeTruthy();
    }
  });

  it('nav points are shared: entry, exit, alcoves identical across variants', () => {
    expect(ENTRY).toEqual({ x: 7, z: 1.5 });
    expect(EXIT_DOOR).toEqual({ x: 7, z: 10 });
    expect(INTERACT_RANGE).toBe(1.6);
    expect(ROOM_W).toBe(14);
    expect(ROOM_D).toBe(10);
    expect(archetypeGeom('boiler').alcoves).toEqual(archetypeGeom('guest').alcoves);
  });
});

describe('Wave 1 authored extras (loot, coins, locks, closets)', () => {
  it('locked exits are exactly doors {4,14}, each with a PICK authored in the same room', () => {
    const locked = SCHEDULE.filter((d) => d.locked).map((d) => d.door);
    expect(locked).toEqual([4, 14]);
    for (const door of locked) {
      expect(doorDef(door).loot, `door ${door} must author the PICK in-room`).toBe('PICK');
    }
  });

  it('loot piles match the authored table and never sit on a GAUNT/CINDER/FINALE door', () => {
    const expectLoot: Record<number, string> = {
      2: 'TONIC', 4: 'PICK', 6: 'FLASK', 8: 'WARD', 11: 'TONIC',
      14: 'PICK', 17: 'FLASK', 23: 'WARD',
    };
    for (const d of SCHEDULE) {
      expect(d.loot ?? null, `door ${d.door}`).toBe(expectLoot[d.door] ?? null);
      if (d.loot) expect([7, 9, 13, 15, 19, 21, 24], `door ${d.door} event`).not.toContain(d.door);
    }
  });

  it('coin piles match the authored table', () => {
    const expectCoins: Record<number, number> = { 2: 3, 3: 2, 6: 4, 8: 3, 11: 2, 17: 5, 20: 3, 23: 4 };
    for (const d of SCHEDULE) {
      expect(d.coins ?? null, `door ${d.door}`).toBe(expectCoins[d.door] ?? null);
    }
  });

  it('closets sit on exactly the GAUNT doors {7,13,19}, inside the room, clear of alcoves and colliders', () => {
    const withCloset = SCHEDULE.filter((d) => d.closet).map((d) => d.door);
    expect(withCloset).toEqual([7, 13, 19]);
    for (const door of withCloset) {
      const def = doorDef(door);
      const c = def.closet!;
      expect(c.x0).toBeGreaterThanOrEqual(0);
      expect(c.x1).toBeLessThanOrEqual(ROOM_W);
      expect(c.z0).toBeGreaterThanOrEqual(0);
      expect(c.z1).toBeLessThanOrEqual(ROOM_D);
      const geom = archetypeGeom(def.archetype);
      const overlaps = (a: AABB, b: AABB) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
      for (const al of geom.alcoves) {
        expect(overlaps(c, al), `door ${door} closet vs alcove`).toBe(false);
      }
      for (const col of geom.colliders) {
        expect(overlaps(c, col), `door ${door} closet vs collider`).toBe(false);
      }
      // reachable: the hide must be enterable before the sweep resolves
      const sweepResolve = def.gaunt!.tellTick + GAUNT_TELL_LEAD + GAUNT_SWEEP_TICKS;
      const maxTravel = (WALK_SPEED * sweepResolve) / 60;
      const dist = Math.hypot((c.x0 + c.x1) / 2 - ENTRY.x, (c.z0 + c.z1) / 2 - ENTRY.z);
      expect(dist, `door ${door} closet reach`).toBeLessThanOrEqual(maxTravel);
    }
  });

  it('every archetype has loot + coin anchors, clear of its colliders', () => {
    const inside = (p: { x: number; z: number }, b: AABB) => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1;
    for (const a of ['junction', 'guest', 'laundry', 'lounge', 'boiler', 'washroom'] as const) {
      const g = archetypeGeom(a);
      expect(g.loot, `${a} loot`).toBeTruthy();
      expect(g.coins, `${a} coins`).toBeTruthy();
      for (const c of g.colliders) {
        expect(inside(g.loot, c), `${a} loot in collider`).toBe(false);
        expect(inside(g.coins, c), `${a} coins in collider`).toBe(false);
      }
    }
  });
});

describe('Wave 2 authored extras (STARE, GRIP)', () => {
  it('STARE doors are exactly {6,14,20}; GRIP doors are exactly {8,17,23}', () => {
    const stare = SCHEDULE.filter((d) => d.stare).map((d) => d.door);
    const grip = SCHEDULE.filter((d) => d.grip).map((d) => d.door);
    expect(stare).toEqual([6, 14, 20]);
    expect(grip).toEqual([8, 17, 23]);
    for (const door of stare) expect(doorDef(door).event).toBe('STARE');
    for (const door of grip) expect(doorDef(door).event).toBe('GRIP');
  });

  // FAIRNESS INVARIANT: STARE's tell must telegraph a full 2 s (120 ticks)
  // before the look-check can open, at a fixed learnable tick, and the eye
  // must hang clear of the collision furniture so the silhouette reads.
  it('STARE manifest points sit in-room, clear of colliders, with a >= 2 s tell lead', () => {
    for (const door of [6, 14, 20]) {
      const def = doorDef(door);
      const st = def.stare!;
      expect(st.tellTick, `door ${door} tell tick is fixed`).toBe(60);
      expect(st.x).toBeGreaterThanOrEqual(0);
      expect(st.x).toBeLessThanOrEqual(ROOM_W);
      expect(st.z).toBeGreaterThanOrEqual(0);
      expect(st.z).toBeLessThanOrEqual(ROOM_D);
      const inside = (p: { x: number; z: number }, b: AABB) => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1;
      for (const c of archetypeGeom(def.archetype).colliders) {
        expect(inside(st, c), `door ${door} STARE inside a collider`).toBe(false);
      }
    }
  });

  // FAIRNESS INVARIANT: a GRIP door is survivable by construction — walking
  // straight from ENTRY to the exit always beats the chase by >= 1 s, and
  // the spawn corner is clear of furniture.
  it('GRIP spawns are in-room, clear of colliders, and outrunnable to the exit by >= 1 s', () => {
    for (const door of [8, 17, 23]) {
      const def = doorDef(door);
      const sp = def.grip!.spawn;
      expect(sp.x).toBeGreaterThanOrEqual(0);
      expect(sp.x).toBeLessThanOrEqual(ROOM_W);
      expect(sp.z).toBeGreaterThanOrEqual(0);
      expect(sp.z).toBeLessThanOrEqual(ROOM_D);
      const inside = (p: { x: number; z: number }, b: AABB) => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1;
      for (const c of archetypeGeom(def.archetype).colliders) {
        expect(inside(sp, c), `door ${door} GRIP spawn inside a collider`).toBe(false);
      }
      const exitTime = Math.hypot(EXIT_DOOR.x - ENTRY.x, EXIT_DOOR.z - ENTRY.z) / WALK_SPEED;
      const killTime = (Math.hypot(sp.x - ENTRY.x, sp.z - ENTRY.z) - GRIP_KILL_DIST) / GRIP_SPEED;
      expect(
        killTime - exitTime,
        `door ${door}: GRIP closes in ${killTime.toFixed(2)} s but the exit takes ${exitTime.toFixed(2)} s`,
      ).toBeGreaterThanOrEqual(1.0);
    }
  });
});
