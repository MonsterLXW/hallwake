// HALLWAKE golden traces — TDD artifact: written BEFORE the sim implementation.
//
// Every expected value below is HAND-COMPUTED from the contract in
// plan/architecture.md §5/§6 and the constants in src/core:
//   dt = 1/60 s, walk speed 2.2 m/s (0.0366667 m/tick), oil drain 1/5400 per
//   tick (1/90 per second), x4 while CINDER is active, refills +0.35 cap 1.
// Assertions are on {alive, door, oil band (0.05 buckets), entity phase,
// deaths, checkpoint} — never on raw float positions.
//
// Room geometry (schedule.ts): room 14 x 10, entry (7, 1.5), exit door (7, 10),
// alcove idx0 = x[0.2,1.6] z[0.6,2.6], idx1 = x[12.4,13.8] z[0.6,2.6],
// boiler A sconces s0(2,3) s1(7,5) s2(12,3), boiler B sconces s0(10,2)
// s1(13,6) s2(12,4), TALLY fake door at (10.5, 9.6), interact range 1.6 m.

import type { Frame } from '../types';

export interface TraceExpect {
  alive: boolean;
  door: number;
  oilBand: number; // Math.floor(oil / 0.05)
  phases: Record<string, string>; // entity kind -> phase at final tick
  deaths?: number;
  checkpoint?: number;
  finished?: boolean;
}

export interface Trace {
  name: string;
  start: { door: number; oil: number; yaw?: number };
  frames: Frame[];
  expect: TraceExpect;
}

const rep = (f: Frame, n: number): Frame[] => Array.from({ length: n }, () => ({ ...f }));
const move = (n: number, mx: number, mz: number): Frame[] => rep({ mx, mz, yawD: 0, interact: false }, n);
const idle = (n: number): Frame[] => move(n, 0, 0);
const tap = (): Frame => ({ mx: 0, mz: 0, yawD: 0, interact: true });

// yaw that points from entry (7,1.5) at MURMUR's door-10 corner (1,9):
// atan2(1-7, 9-1.5) = atan2(-6, 7.5) = -0.6747434853607526 rad.
const YAW_AT_MURMUR_10 = -0.6747434853607526;

export const TRACES: Trace[] = [
  {
    name: 'gaunt7_survive',
    // Walk west into alcove idx0, stand still. GAUNT: tell roomTick 60,
    // sweep 205..564, resolve at 565. Player parks at tick 170:
    // x = 7 - 170*0.0366667 = 0.76667 in [0.2,1.6], z = 1.5 in [0.6,2.6].
    // Hidden + still for every sweep tick -> SURVIVED.
    start: { door: 7, oil: 1.0 },
    frames: [...move(170, -1, 0), ...idle(400)], // 570 ticks
    expect: {
      alive: true,
      door: 7,
      // oil = 1 - 570/5400 = 0.894444 -> band 17
      oilBand: 17,
      phases: { GAUNT: 'SURVIVED' },
      deaths: 0,
    },
  },
  {
    name: 'gaunt7_death_moving',
    // Same park, then walk east again: at sweep start (205) x =
    // 0.76667 + 35*0.0366667 = 2.05 > 1.6 -> outside the alcove, and
    // |vel| = 2.2 -> hiddenOk fails every sweep tick -> death at 565.
    start: { door: 7, oil: 1.0 },
    frames: [...move(170, -1, 0), ...move(400, 1, 0)], // 570 ticks
    expect: {
      alive: false,
      door: 7,
      // oil = 1 - 570/5400 = 0.894444 -> band 17 (drain stops at death)
      oilBand: 17,
      phases: { GAUNT: 'SWEEP' },
      deaths: 0, // deaths counter increments on respawn, not on death
    },
  },
  {
    name: 'murmur10_beam_walk',
    // Beam locked on MURMUR (yaw = corner bearing), back 100 ticks toward
    // the exit, then hold. Worst cone error at z = 5.16667:
    // bearing atan2(-6, 3.83333) = -1.0062, |diff| = 0.3627 <= 25 deg.
    // Every 60-tick check freezes it -> dist never shrinks.
    start: { door: 10, oil: 0.6, yaw: YAW_AT_MURMUR_10 },
    frames: [...move(100, 0, 1), ...idle(500)], // 600 ticks
    expect: {
      alive: true,
      door: 10,
      // oil = 0.6 - 600/5400 = 0.488889 -> band 9
      oilBand: 9,
      phases: { MURMUR: 'FROZEN' },
      deaths: 0,
    },
  },
  {
    name: 'murmur10_oil_out_death',
    // Facing north (yaw 0): MURMUR bearing -0.6747 is outside the 25 deg
    // cone, so it steps 1.2 m every 60 ticks regardless of oil.
    // Initial dist = hypot(6, 7.5) = 9.6047; after k steps 9.6047 - 1.2k:
    // k=6 -> 2.405, k=7 -> 1.205 < 1.5 -> death at roomTick 420.
    // Freeze 90 ticks -> respawn at checkpoint 9 with oil 0.6 at tick 510,
    // then 90 more drain ticks: oil = 0.6 - 90/5400 = 0.583333 -> band 11.
    start: { door: 10, oil: 0.25 },
    frames: idle(600),
    expect: {
      alive: true,
      door: 9,
      oilBand: 11,
      phases: { CINDER: 'TELL' }, // door 9 entities rebuilt on respawn; tell at roomTick 60
      deaths: 1,
      checkpoint: 9,
    },
  },
  {
    name: 'tally5_fake_door_death',
    // TALLY tell at roomTick 60, fake door (numeral 8 = expected 6 + 2)
    // spawns at 120 at (10.5, 9.6). Walk north then east:
    // 200 ticks north -> z = 8.83333; 100 ticks east -> x = 10.66667;
    // dist to fake = hypot(0.16667, 0.76667) = 0.784 < 1.6. Interact at
    // tick 301 -> death (the fake door is a mouth).
    start: { door: 5, oil: 1.0 },
    frames: [...move(200, 0, 1), ...move(100, 1, 0), tap()], // 301 ticks
    expect: {
      alive: false,
      door: 5,
      // oil = 1 - 301/5400 = 0.944259 -> band 18
      oilBand: 18,
      phases: { TALLY: 'FAKE' },
      deaths: 0,
    },
  },
  {
    name: 'cinder9_relight_order',
    // Door 9 (boiler A), scratch order [0,1,2], sconces s0(2,3) s1(7,5)
    // s2(12,3). CINDER tell 60, BLACKOUT from 120 (extinguish 120/300/480).
    // Route: 135 west -> (2.05,1.5), dist to s0 = 1.501 < 1.6, tap at 136.
    // 90 north + 140 east -> (7.18333,4.8), dist to s1 = 0.271, tap at 367.
    // 130 east + 50 south -> (11.94,2.96667), dist to s2 = 0.075, tap at 548
    // -> progress 3 -> BANISHED, oil refills to 1.0 (cap). 60 idle ticks:
    // oil = 1 - 60/5400 = 0.988889 -> band 19.
    start: { door: 9, oil: 0.8 },
    frames: [
      ...move(135, -1, 0),
      tap(), // tick 136: relight sconce 0
      ...move(90, 0, 1),
      ...move(140, 1, 0),
      tap(), // tick 367: relight sconce 1
      ...move(130, 1, 0),
      ...move(50, 0, -1),
      tap(), // tick 548: relight sconce 2 -> BANISHED
      ...idle(60),
    ], // 608 ticks
    expect: {
      alive: true,
      door: 9,
      oilBand: 19,
      phases: { CINDER: 'BANISHED' },
      deaths: 0,
    },
  },
  {
    name: 'checkpoint_respawn',
    // Start mid-block at door 12 (checkpoint 9). TALLY fake at (10.5,9.6).
    // Same walk as tally5: tap at tick 301 -> death; freeze 90 -> respawn
    // at door 9, oil 0.6, deaths 1 at tick 391 (roomTick 0 -> CINDER IDLE).
    start: { door: 12, oil: 0.25 },
    frames: [...move(200, 0, 1), ...move(100, 1, 0), tap(), ...idle(90)], // 391 ticks
    expect: {
      alive: true,
      door: 9,
      oilBand: 12, // oil exactly 0.6 on respawn
      phases: { CINDER: 'IDLE' },
      deaths: 1,
      checkpoint: 9,
    },
  },
  {
    name: 'finale24_survive',
    // Door 24 (boiler B): CINDER order [0,2,1] with s0(10,2) s1(13,6)
    // s2(12,4); GAUNT tell delayed to roomTick 300, sweep 445..804,
    // resolve 805; alcove idx1 = x[12.4,13.8] z[0.6,2.6].
    //   75 east -> (9.75,1.5), dist s0 = 0.559; idle to 120; tap at 121.
    //   60 east + 55 north -> (11.95,3.51667), dist s2 = 0.492; tap at 237.
    //   28 east + 65 north -> (12.97667,5.90833), dist s1 = 0.097; tap at
    //   331 -> BANISHED (before the sweep).
    //   113 south -> (12.97667,1.765) inside the alcove at tick 444,
    //   velocity zero before tick 445, hidden for all of 445..804.
    //   Idle to 810 -> GAUNT resolves SURVIVED at 805 -> finished.
    // Oil: x4 drain 60..331 with +0.35 taps (caps at 1.0), then x1 for
    // 810-331 = 479 ticks: oil = 1 - 479/5400 = 0.911296 -> band 18.
    start: { door: 24, oil: 1.0 },
    frames: [
      ...move(75, 1, 0),
      ...idle(45), // ticks 76..120
      tap(), // tick 121: relight sconce 0
      ...move(60, 1, 0),
      ...move(55, 0, 1),
      tap(), // tick 237: relight sconce 2
      ...move(28, 1, 0),
      ...move(65, 0, 1),
      tap(), // tick 331: relight sconce 1 -> BANISHED
      ...move(113, 0, -1), // arrive alcove at tick 444
      ...idle(366), // ticks 445..810
    ], // 810 ticks
    expect: {
      alive: true,
      door: 24,
      oilBand: 18,
      phases: { CINDER: 'BANISHED', GAUNT: 'SURVIVED' },
      deaths: 0,
      finished: true,
    },
  },
];
