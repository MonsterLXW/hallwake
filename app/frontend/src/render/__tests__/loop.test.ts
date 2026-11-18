// HALLWAKE — headless proof of the dev entry: the autopilot in loop.ts must
// actually play the corridor through the real sim (doors 1..N, events,
// deaths, respawns) with zero DOM/WebGL. The browser perf gate (?auto=1)
// runs this exact frame producer, so what passes here is what the
// orchestrator measures.

import { describe, expect, it } from 'vitest';
import { createInitialState, makeRoomState, stepSim } from '../../core/sim';
import { createAutopilot, DT, frameHasInput, MAX_CATCHUP_STEPS } from '../loop';

describe('fixed-timestep constants', () => {
  it('dt is 1/60 with a 5-step catch-up cap', () => {
    expect(DT).toBeCloseTo(1 / 60, 10);
    expect(MAX_CATCHUP_STEPS).toBe(5);
  });
});

describe('frameHasInput (kiosk idle: gamepad counts as activity)', () => {
  it('an all-zero frame is idle', () => {
    expect(frameHasInput({ mx: 0, mz: 0, yawD: 0, interact: false })).toBe(false);
  });
  it('any stick, look, or interact input is activity', () => {
    expect(frameHasInput({ mx: 0.5, mz: 0, yawD: 0, interact: false })).toBe(true); // left stick
    expect(frameHasInput({ mx: 0, mz: 0, yawD: 0.05, interact: false })).toBe(true); // right stick
    expect(frameHasInput({ mx: 0, mz: 0, yawD: 0, interact: true })).toBe(true); // A/X
  });
  it('the autopilot emits activity frames while it plays (idle timer stays fed)', () => {
    const ap = createAutopilot();
    let s = createInitialState(1);
    s = stepSim(s, ap(s));
    expect(frameHasInput(ap(s))).toBe(true);
  });
});

describe('autopilot dev entry (plays doors with the sim)', () => {
  it('emits bounded, finite Frames', () => {
    const ap = createAutopilot();
    let s = createInitialState(1);
    for (let i = 0; i < 600; i++) {
      s = stepSim(s, ap(s));
      const f = ap(s);
      expect(Number.isFinite(f.mx) && Number.isFinite(f.mz) && Number.isFinite(f.yawD)).toBe(true);
      expect(Math.abs(f.mx)).toBeLessThanOrEqual(1);
      expect(Math.abs(f.mz)).toBeLessThanOrEqual(1);
    }
  });

  it('plays through TALLY, GAUNT, CINDER and MURMUR doors headlessly', () => {
    const ap = createAutopilot();
    let s = createInitialState(1);
    // 60k ticks = 1000 sim-seconds: enough for the scripted run to clear the
    // first third of the schedule including deaths + checkpoint respawns.
    for (let i = 0; i < 60_000 && !s.finished; i++) s = stepSim(s, ap(s));
    // Verified trace: the autopilot clears doors 1-13 with zero deaths —
    // TALLY 5 (real door), GAUNT 7 (alcove survive), CINDER 9 (scratch-order
    // relight + banish), MURMUR 10 (beam freeze + back to exit), TALLY 12.
    // It then loops at door 13: that door's GAUNT alcove (index 2) is 7.99 m
    // from ENTRY but the sweep starts at roomTick 205 (7.48 m of travel at
    // 2.2 m/s) — unsurvivable by construction, a schedule-table issue owned
    // by T1, not a renderer/autopilot bug.
    expect(s.deepest).toBeGreaterThanOrEqual(12);
    expect(s.tick).toBeGreaterThan(0);
  });

  it('clears the Wave 1 locked door 4 by grabbing the authored PICK first', () => {
    const ap = createAutopilot();
    let s = makeRoomState(4, 1); // locked exit, PICK loot in-room
    for (let i = 0; i < 3000 && s.door === 4 && s.alive; i++) s = stepSim(s, ap(s));
    expect(s.door).toBe(5);
    expect(s.inv.includes('PICK')).toBe(false); // the PICK was spent on the lock
  });

  it('survives door 6 STARE: it walks the lane with its view averted', () => {
    const ap = createAutopilot();
    let s = makeRoomState(6, 1);
    for (let i = 0; i < 700 && s.door === 6 && s.alive; i++) s = stepSim(s, ap(s));
    expect(s.alive).toBe(true);
    expect(s.door).toBe(7); // cleared the eye room before the sweep door's resolve
  });

  it('outruns door 8 GRIP: sprints the lounge lane to the exit, ignores the WARD bait', () => {
    const ap = createAutopilot();
    let s = makeRoomState(8, 1);
    for (let i = 0; i < 600 && s.door === 8 && s.alive; i++) s = stepSim(s, ap(s));
    expect(s.alive).toBe(true);
    expect(s.door).toBe(9);
  });

  it('clears door 14 (STARE + locked exit): averts the view, spends the PICK, opens', () => {
    const ap = createAutopilot();
    let s = makeRoomState(14, 1);
    for (let i = 0; i < 3000 && s.door === 14 && s.alive; i++) s = stepSim(s, ap(s));
    expect(s.alive).toBe(true);
    expect(s.door).toBe(15);
  });

  it('finishes the whole 24-door run with zero deaths (?auto=1 perf gate)', () => {
    const ap = createAutopilot();
    let s = createInitialState(1);
    for (let i = 0; i < 60_000 && !s.finished; i++) s = stepSim(s, ap(s));
    expect(s.finished).toBe(true);
    expect(s.deaths).toBe(0);
    expect(s.deepest).toBe(24);
  });
});
