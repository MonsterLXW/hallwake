// Golden assertions on the fixed 24-door schedule (architecture.md §4).
// This table IS the product thesis: identical every run, no RNG.

import { describe, it, expect } from 'vitest';
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
    expect(doorDef(13).gaunt!.alcoveIndex).toBe(2);
    expect(doorDef(19).gaunt!.alcoveIndex).toBe(1);
    expect(doorDef(24).gaunt!.alcoveIndex).toBe(1);
  });

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
