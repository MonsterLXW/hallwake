// FSM unit tests for the four entities + oil economy + scoring validation.

import { describe, it, expect } from 'vitest';
import { stepSim, makeRoomState, createInitialState } from '../sim';
import { buildEntities, stepGaunt, stepMurmur, stepTally, stepCinder } from '../entities';
import { drainOil, refillOil, lanternRadius, OIL_DRAIN_PER_TICK, OIL_CRITICAL } from '../oil';
import { validateScore, runCardFrom } from '../scoring';
import { doorDef } from '../schedule';
import type { Frame, GauntState, MurmurState, TallyState, CinderState, PlayerState } from '../types';

const NOOP: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };
const still: PlayerState = { x: 7, z: 1.5, yaw: 0, vel: { x: 0, z: 0 } };
const moving: PlayerState = { x: 7, z: 1.5, yaw: 0, vel: { x: 2.2, z: 0 } };

describe('GAUNT FSM', () => {
  const g0 = (): GauntState => buildEntities(doorDef(7)).find((e) => e.kind === 'GAUNT') as GauntState;

  it('IDLE until roomTick 60, then TELL with a tell event', () => {
    let g = g0();
    for (let t = 1; t < 60; t++) g = stepGaunt(g, t, still, doorDef(7), 1, 7).e;
    expect(g.phase).toBe('IDLE');
    const r = stepGaunt(g, 60, still, doorDef(7), 1, 7);
    expect(r.e.phase).toBe('TELL');
    expect(r.events.some((e) => e.type === 'tell' && e.entity === 'GAUNT')).toBe(true);
  });

  it('SWEEP begins at roomTick 205 and resolves SURVIVED at 565 when hidden', () => {
    let g = g0();
    const inAlcove: PlayerState = { x: 0.9, z: 1.5, yaw: 0, vel: { x: 0, z: 0 } };
    for (let t = 1; t <= 205; t++) g = stepGaunt(g, t, inAlcove, doorDef(7), 1, 7).e;
    expect(g.phase).toBe('SWEEP');
    for (let t = 206; t <= 565; t++) g = stepGaunt(g, t, inAlcove, doorDef(7), 1, 7).e;
    expect(g.phase).toBe('SURVIVED');
  });

  it('moving during the sweep dooms the player -> death at resolve', () => {
    let g = g0();
    let died = false;
    for (let t = 1; t <= 565; t++) {
      const r = stepGaunt(g, t, moving, doorDef(7), 1, 7);
      g = r.e;
      if (r.died) died = true;
    }
    expect(died).toBe(true);
    expect(g.phase).toBe('SWEEP');
  });
});

describe('MURMUR FSM', () => {
  const m0 = (): MurmurState => buildEntities(doorDef(10)).find((e) => e.kind === 'MURMUR') as MurmurState;

  it('freezes when inside the 25-degree lantern cone with oil > 0.20', () => {
    const m = m0();
    const p: PlayerState = { x: 7, z: 1.5, yaw: -0.6747434853607526, vel: { x: 0, z: 0 } };
    const r = stepMurmur(m, 60, p, 0.5, 10);
    expect(r.e.phase).toBe('FROZEN');
    expect(r.e.dist).toBeCloseTo(Math.hypot(6, 7.5), 9);
  });

  it('advances 1.2 m per 60-tick step when outside the cone', () => {
    let m = m0();
    const d0 = Math.hypot(m.x - still.x, m.z - still.z);
    const r = stepMurmur(m, 60, still, 0.5, 10); // yaw 0 -> corner bearing -0.675 outside cone
    expect(r.e.phase).toBe('HUNT');
    expect(r.e.dist).toBeCloseTo(d0 - 1.2, 9);
  });

  it('advances even in the cone when oil <= 0.20', () => {
    const m = m0();
    const p: PlayerState = { x: 7, z: 1.5, yaw: -0.6747434853607526, vel: { x: 0, z: 0 } };
    const r = stepMurmur(m, 60, p, 0.2, 10);
    expect(r.e.phase).toBe('HUNT');
  });

  it('kills at dist < 1.5', () => {
    const m: MurmurState = { ...m0(), dist: 2.0, x: 7, z: 3.0 };
    const r = stepMurmur(m, 60, still, 0.0, 10);
    expect(r.died).toBe(true);
  });
});

describe('TALLY FSM', () => {
  it('TELL at 60, FAKE at 120; fake numeral = expected + 2', () => {
    let t = buildEntities(doorDef(5)).find((e) => e.kind === 'TALLY') as TallyState;
    t = stepTally(t, 59, 1, 5).e;
    expect(t.phase).toBe('IDLE');
    t = stepTally(t, 60, 1, 5).e;
    expect(t.phase).toBe('TELL');
    t = stepTally(t, 119, 1, 5).e;
    expect(t.phase).toBe('TELL');
    t = stepTally(t, 120, 1, 5).e;
    expect(t.phase).toBe('FAKE');
    expect(doorDef(5).tallyFakeNum).toBe(6 + 2); // expected door is 6
  });
});

describe('CINDER FSM', () => {
  const c0 = (): CinderState => buildEntities(doorDef(9)).find((e) => e.kind === 'CINDER') as CinderState;

  it('TELL at 60, BLACKOUT at 120, extinguishes one sconce per 3 s', () => {
    let c = c0();
    c = stepCinder(c, 60, 1, 9).e;
    expect(c.phase).toBe('TELL');
    c = stepCinder(c, 120, 1, 9).e;
    expect(c.phase).toBe('BLACKOUT');
    expect(c.blackoutCount).toBe(1);
    c = stepCinder(c, 300, 1, 9).e;
    expect(c.blackoutCount).toBe(2);
    c = stepCinder(c, 480, 1, 9).e;
    expect(c.blackoutCount).toBe(3);
  });

  it('correct scratch order progresses; wrong order resets progress', () => {
    let c = c0();
    c = stepCinder(c, 120, 1, 9).e;
    // door 9 order [0,1,2]
    expect(c.progress).toBe(0);
    c = { ...c, progress: c.progress + 1 }; // relight 0 (sim applies this on tap)
    c = { ...c, progress: c.progress + 1 }; // relight 1
    c = { ...c, progress: 0 }; // wrong tap resets
    expect(c.progress).toBe(0);
  });

  it('banishes when all three sconces are relit in order', () => {
    let c = c0();
    c = stepCinder(c, 120, 1, 9).e;
    for (let i = 0; i < 3; i++) c = { ...c, progress: c.progress + 1 };
    expect(c.progress).toBe(3);
  });
});

describe('oil economy', () => {
  it('drains 1/5400 per tick; full tank lasts 90 s', () => {
    expect(OIL_DRAIN_PER_TICK).toBeCloseTo(1 / 5400, 12);
    let oil = 1;
    for (let t = 0; t < 5400; t++) oil = drainOil(oil, 1);
    expect(oil).toBeCloseTo(0, 9);
  });

  it('CINDER drains x4', () => {
    const oil = drainOil(1, 4);
    expect(oil).toBeCloseTo(1 - 4 / 5400, 12);
  });

  it('refill +0.35 caps at 1', () => {
    expect(refillOil(0.8, 0.35)).toBe(1);
    expect(refillOil(0.3, 0.35)).toBeCloseTo(0.65, 12);
  });

  it('radius = 2 + 6*oil; critical threshold 0.20', () => {
    expect(lanternRadius(1)).toBe(8);
    expect(lanternRadius(0)).toBe(2);
    expect(OIL_CRITICAL).toBe(0.2);
  });

  it('oil reaching 0 during CINDER triggers early GAUNT death', () => {
    let s = makeRoomState(9, 0.02);
    for (let t = 0; t < 200 && s.alive; t++) s = stepSim(s, NOOP);
    expect(s.alive).toBe(false);
    expect(s.events.some((e) => e.type === 'death' && e.entity === 'GAUNT')).toBe(true);
  });
});

describe('scoring validation (mirrors backend rules, architecture.md §10)', () => {
  const good = { name: 'NIGHT PORTER', deepest_door: 24, run_time_ms: 300000, deaths: 2 };

  it('accepts a valid run card', () => {
    expect(validateScore(good).ok).toBe(true);
  });

  it('rejects a 13-char name', () => {
    expect(validateScore({ ...good, name: 'ABCDEFGHIJKLM' }).ok).toBe(false);
  });

  it('rejects bad name characters', () => {
    expect(validateScore({ ...good, name: 'o7 <script>' }).ok).toBe(false);
  });

  it('rejects door 25 and door 0', () => {
    expect(validateScore({ ...good, deepest_door: 25 }).ok).toBe(false);
    expect(validateScore({ ...good, deepest_door: 0 }).ok).toBe(false);
  });

  it('rejects runMs 9999 and 1800001', () => {
    expect(validateScore({ ...good, run_time_ms: 9999 }).ok).toBe(false);
    expect(validateScore({ ...good, run_time_ms: 1800001 }).ok).toBe(false);
  });

  it('rejects deaths 100', () => {
    expect(validateScore({ ...good, deaths: 100 }).ok).toBe(false);
  });

  it('runCardFrom extracts the three leaderboard fields', () => {
    const s = createInitialState(1);
    const card = runCardFrom(s);
    expect(card).toEqual({ deepest_door: 1, run_time_ms: 0, deaths: 0 });
  });
});
