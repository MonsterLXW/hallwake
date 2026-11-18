// HALLWAKE — Wave 4 minimap selector: the SVG plate is only allowed to draw
// what minimapData(sim) derives. These tests pin that derivation against
// hand-read schedule geometry: bounds/props, exit + lock state, closet,
// Prospect-gated loot, and entity blips — pure, deterministic, no new state.

import { describe, expect, it } from 'vitest';
import { makeRoomState } from '../sim';
import { minimapData } from '../minimap';
import { FAKE_DOOR_POS, archetypeGeom } from '../schedule';
import type { SimState } from '../types';

describe('minimapData (pure selector)', () => {
  it('door 1: prop walls, exit bar, no closet, no loot, no blips, porter at entry', () => {
    const m = minimapData(makeRoomState(1, 1));
    expect(m.door).toBe(1);
    expect(m.colliders).toEqual(archetypeGeom('junction').colliders); // two crate stacks
    expect(m.exit).toEqual({ x: 7, z: 10 });
    expect(m.locked).toBe(false);
    expect(m.closet).toBeNull();
    expect(m.loot).toBeNull();
    expect(m.blips).toEqual([]);
    expect(m.player).toEqual({ x: 7, z: 1.5, yaw: 0 });
  });

  it('closet rect shows on door 13; the exit flags locked only while the kit lacks a PICK', () => {
    const m13 = minimapData(makeRoomState(13, 1));
    expect(m13.closet).toEqual({ x0: 12.4, x1: 13.8, z0: 7.4, z1: 9.4 });
    expect(minimapData(makeRoomState(4, 1)).locked).toBe(true); // door 4: locked, no PICK
    const withPick: SimState = { ...makeRoomState(4, 1), inv: ['PICK'] };
    expect(minimapData(withPick).locked).toBe(false);
  });

  it('loot glints only with the Prospect perk, and only while the pile is still there', () => {
    expect(minimapData(makeRoomState(8, 1)).loot).toBeNull(); // WARD pile authored, no Prospect
    const prospect: SimState = { ...makeRoomState(8, 1), perks: ['PROSPECT'] };
    expect(minimapData(prospect).loot).toEqual({ x: 12, z: 3 });
    const taken: SimState = { ...makeRoomState(8, 1), perks: ['PROSPECT'], lootTaken: true };
    expect(minimapData(taken).loot).toBeNull();
  });

  it('blips: GRIP from the first tick, GAUNT only once live, TALLY at the fake-door slot', () => {
    expect(minimapData(makeRoomState(8, 1)).blips).toEqual([{ x: 1, z: 9, kind: 'GRIP' }]);
    expect(minimapData(makeRoomState(7, 1)).blips).toEqual([]); // GAUNT IDLE: nothing to mark
    const sweep: SimState = {
      ...makeRoomState(7, 1),
      entities: [{ kind: 'GAUNT', phase: 'SWEEP', hiddenOk: false, x: 5, z: 5 }],
    };
    expect(minimapData(sweep).blips).toEqual([{ x: 5, z: 5, kind: 'GAUNT' }]);
    const survived: SimState = {
      ...makeRoomState(7, 1),
      entities: [{ kind: 'GAUNT', phase: 'SURVIVED', hiddenOk: true, x: 13, z: 8 }],
    };
    expect(minimapData(survived).blips).toEqual([]); // terminal: no blip
    const fake: SimState = {
      ...makeRoomState(5, 1),
      entities: [{ kind: 'TALLY', phase: 'FAKE' }],
    };
    expect(minimapData(fake).blips).toEqual([{ x: FAKE_DOOR_POS.x, z: FAKE_DOOR_POS.z, kind: 'TALLY' }]);
  });

  it('pure and deterministic: same state in, deep-equal data out, input untouched', () => {
    const s = makeRoomState(13, 1);
    const snap = JSON.stringify(s);
    const a = minimapData(s);
    const b = minimapData(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(s)).toBe(snap);
  });
});
