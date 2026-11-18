// Golden-trace runner + determinism proof + core purity source scan.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState, makeRoomState, stepSim, PITCH_LIMIT } from '../sim';
import type { Frame, ItemType, SimState } from '../types';
import { TRACES } from './traces';

function runTrace(start: { door: number; oil: number; yaw?: number }, frames: readonly { mx: number; mz: number; yawD: number; interact: boolean }[]): SimState {
  let s = makeRoomState(start.door, start.oil);
  if (start.yaw !== undefined) s = { ...s, player: { ...s.player, yaw: start.yaw } };
  for (const f of frames) s = stepSim(s, f);
  return s;
}

describe('golden traces', () => {
  for (const t of TRACES) {
    it(`${t.name}: final state matches hand-computed expectations`, () => {
      const s = runTrace(t.start, t.frames);
      expect(s.alive, 'alive').toBe(t.expect.alive);
      expect(s.door, 'door').toBe(t.expect.door);
      // +1e-9 guards float edges (0.6/0.05 = 11.999999999999998)
      expect(Math.floor(s.oil / 0.05 + 1e-9), `oil band (oil=${s.oil})`).toBe(t.expect.oilBand);
      for (const [kind, phase] of Object.entries(t.expect.phases)) {
        const e = s.entities.find((x) => x.kind === kind);
        expect(e, `entity ${kind}`).toBeTruthy();
        expect(e!.phase, `${kind} phase`).toBe(phase);
      }
      if (t.expect.deaths !== undefined) expect(s.deaths, 'deaths').toBe(t.expect.deaths);
      if (t.expect.checkpoint !== undefined) expect(s.checkpoint, 'checkpoint').toBe(t.expect.checkpoint);
      if (t.expect.finished !== undefined) expect(s.finished, 'finished').toBe(t.expect.finished);
    });
  }

  it('every trace is deterministic: identical state on a second run', () => {
    for (const t of TRACES) {
      const a = JSON.stringify(runTrace(t.start, t.frames));
      const b = JSON.stringify(runTrace(t.start, t.frames));
      expect(a, `${t.name} determinism`).toBe(b);
    }
  });
});

describe('createInitialState', () => {
  it('spawns at door 1, checkpoint 1, full oil, door log 2', () => {
    const s = createInitialState(12345);
    expect(s.door).toBe(1);
    expect(s.checkpoint).toBe(1);
    expect(s.oil).toBe(1);
    expect(s.doorLog).toBe(2);
    expect(s.alive).toBe(true);
    expect(s.tick).toBe(0);
    expect(s.entities).toEqual([]);
  });

  it('ignores the seed: two seeds produce identical state (no RNG)', () => {
    expect(JSON.stringify(createInitialState(1))).toBe(JSON.stringify(createInitialState(999999)));
  });

  it('opening the exit door advances and logs the next door', () => {
    let s = createInitialState(7);
    // walk north to the exit at (7,10): 9.5 m / 2.2 m/s = 259.09 ticks
    for (let i = 0; i < 260; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
    expect(s.player.z).toBeGreaterThanOrEqual(8.4);
    s = stepSim(s, { mx: 0, mz: 0, yawD: 0, interact: true });
    expect(s.door).toBe(2);
    expect(s.doorLog).toBe(3);
    expect(s.events.some((e) => e.type === 'door_open' && e.door === 2)).toBe(true);
  });

  it('entering a checkpoint door emits a checkpoint event and sets it', () => {
    let s = createInitialState(7);
    for (let d = 1; d <= 4; d++) {
      for (let i = 0; i < 260; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
      if (d === 4) s = { ...s, inv: ['PICK'] }; // Wave 1: door 4's exit is locked
      s = stepSim(s, { mx: 0, mz: 0, yawD: 0, interact: true });
    }
    expect(s.door).toBe(5);
    expect(s.checkpoint).toBe(5);
    expect(s.events.some((e) => e.type === 'checkpoint' && e.door === 5)).toBe(true);
  });
});

describe('Wave 1: loot, coins, locked doors, closets, death-saves', () => {
  const NOOP: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };
  const tap: Frame = { mx: 0, mz: 0, yawD: 0, interact: true };
  const move = (n: number, mx: number, mz: number): Frame[] =>
    Array.from({ length: n }, () => ({ mx, mz, yawD: 0, interact: false }));

  it('picks up authored loot into the kit and emits a loot event', () => {
    let s = makeRoomState(2, 1); // door 2: TONIC at (12,3), coins 3 at (7,3)
    for (let i = 0; i < 41; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
    s = stepSim(s, tap); // (7, ~3.0) is within 1.6 m of the coin pile at (7,3)
    expect(s.coins).toBe(3);
    expect(s.coinsTaken).toBe(true);
    expect(s.events.some((e) => e.type === 'coin')).toBe(true);
    // walk east to the loot pile at (12,3)
    for (let i = 0; i < 135; i++) s = stepSim(s, { mx: 1, mz: 0, yawD: 0, interact: false });
    s = stepSim(s, tap);
    expect(s.inv).toEqual(['TONIC']);
    expect(s.lootTaken).toBe(true);
    expect(s.events.some((e) => e.type === 'loot' && e.item === 'TONIC')).toBe(true);
    // a second tap cannot double-pick
    s = stepSim(s, tap);
    expect(s.inv).toEqual(['TONIC']);
  });

  it('the kit caps at 4: a full pack refuses the pickup', () => {
    // no FLASK in the pack: with nothing else acted on, E would drink it
    let s = { ...makeRoomState(2, 1), inv: ['WARD', 'TONIC', 'PICK', 'WARD'] as ItemType[] };
    for (let i = 0; i < 135; i++) s = stepSim(s, { mx: 1, mz: 0, yawD: 0, interact: false });
    // x = 7 + 135*0.0366667 = 11.95, z = 1.5 -> dist to (12,3) = 1.508 < 1.6
    s = stepSim(s, tap);
    expect(s.inv).toHaveLength(4);
    expect(s.lootTaken).toBe(false);
  });

  it('a locked exit needs a PICK: no pick keeps the door shut, a pick consumes one', () => {
    let s = makeRoomState(4, 1); // door 4: locked exit, PICK loot authored here
    for (let i = 0; i < 260; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
    s = stepSim(s, tap); // no PICK in the kit -> stays locked
    expect(s.door).toBe(4);
    expect(s.events.some((e) => e.type === 'door_open')).toBe(false);
    s = { ...s, inv: ['PICK'] };
    s = stepSim(s, tap);
    expect(s.door).toBe(5);
    expect(s.inv).toEqual([]); // the PICK was consumed
    expect(s.events.some((e) => e.type === 'item_use' && e.item === 'PICK')).toBe(true);
    expect(s.events.some((e) => e.type === 'lock')).toBe(true);
    expect(s.events.some((e) => e.type === 'door_open' && e.door === 5)).toBe(true);
  });

  it('closet: E near the closet hides you, movement locks, E again steps out', () => {
    let s = makeRoomState(7, 1); // door 7: closet center (13.1, 8.4)
    for (let i = 0; i < 167; i++) s = stepSim(s, { mx: 1, mz: 0, yawD: 0, interact: false }); // x -> 13.12
    for (let i = 0; i < 145; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false }); // z -> 6.82
    s = stepSim(s, tap); // dist to center 1.584 < 1.6 -> enter
    expect(s.hidden).toBe(true);
    expect(s.player.x).toBeCloseTo(13.1, 9);
    expect(s.player.z).toBeCloseTo(8.4, 9);
    expect(s.events.some((e) => e.type === 'hide')).toBe(true);
    // movement is locked while hidden
    const before = { x: s.player.x, z: s.player.z };
    for (let i = 0; i < 30; i++) s = stepSim(s, { mx: 1, mz: -1, yawD: 0, interact: false });
    expect(s.player.x).toBeCloseTo(before.x, 9);
    expect(s.player.z).toBeCloseTo(before.z, 9);
    s = stepSim(s, tap); // exit
    expect(s.hidden).toBe(false);
  });

  it('closet hide makes the GAUNT sweep non-lethal even after being caught moving', () => {
    let s = makeRoomState(7, 1);
    // walk to the closet during the sweep (hiddenOk latches false at 206,
    // but a closed closet door is a wall at resolve time)
    for (let i = 0; i < 167; i++) s = stepSim(s, { mx: 1, mz: 0, yawD: 0, interact: false });
    for (let i = 0; i < 145; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
    s = stepSim(s, tap); // hide at ~tick 313, sweep runs 205..564
    expect(s.hidden).toBe(true);
    for (let i = 0; i < 260; i++) s = stepSim(s, NOOP); // past resolve at 565
    expect(s.alive).toBe(true);
    const g = s.entities.find((e) => e.kind === 'GAUNT');
    expect(g!.phase).toBe('SURVIVED');
  });

  it('TONIC survives the killing hit: consumed, brief invuln, sweep ends', () => {
    let s = { ...makeRoomState(7, 1), inv: ['TONIC'] as ItemType[] };
    for (let i = 0; i < 565; i++) s = stepSim(s, NOOP); // stand in the open: doomed at 565
    expect(s.alive).toBe(true);
    expect(s.inv).toEqual([]); // TONIC consumed
    expect(s.invuln).toBe(180); // 3 s of grace granted
    expect(s.events.some((e) => e.type === 'item_use' && e.item === 'TONIC')).toBe(true);
    const g = s.entities.find((e) => e.kind === 'GAUNT');
    expect(g!.phase).toBe('SURVIVED');
    // the grace window ticks down every tick
    s = stepSim(s, NOOP);
    expect(s.invuln).toBe(179);
  });

  it('WARD banishes the killing entity: consumed, terminal phase, banish event', () => {
    let s = { ...makeRoomState(7, 1), inv: ['WARD'] as ItemType[] };
    for (let i = 0; i < 565; i++) s = stepSim(s, NOOP);
    expect(s.alive).toBe(true);
    expect(s.inv).toEqual([]);
    expect(s.events.some((e) => e.type === 'item_use' && e.item === 'WARD')).toBe(true);
    expect(s.events.some((e) => e.type === 'banish' && e.entity === 'GAUNT')).toBe(true);
    const g = s.entities.find((e) => e.kind === 'GAUNT');
    expect(g!.phase).toBe('SURVIVED');
  });

  it('WARD banishes MURMUR into its BANISHED terminal and it never hunts again', () => {
    let s = { ...makeRoomState(10, 0.25), inv: ['WARD'] as ItemType[] }; // facing north: it steps in and kills at 420
    let banished = false;
    for (let i = 0; i < 500 && !banished; i++) {
      s = stepSim(s, NOOP);
      banished = s.events.some((e) => e.type === 'banish' && e.entity === 'MURMUR');
    }
    expect(banished).toBe(true);
    expect(s.alive).toBe(true);
    expect(s.inv).toEqual([]);
    for (let i = 0; i < 80; i++) s = stepSim(s, NOOP); // it never steps or kills again
    const m = s.entities.find((e) => e.kind === 'MURMUR');
    expect(m!.phase).toBe('BANISHED');
    expect(s.alive).toBe(true);
  });

  it('without the kit the same hits still kill (death-saves are not free)', () => {
    let s = makeRoomState(7, 1);
    for (let i = 0; i < 565; i++) s = stepSim(s, NOOP);
    expect(s.alive).toBe(false);
    expect(s.events.some((e) => e.type === 'death' && e.entity === 'GAUNT')).toBe(true);
  });

  it('FLASK: E with nothing in range drinks +0.5 oil; number key 4 does the same', () => {
    let s = { ...makeRoomState(1, 0.3), inv: ['FLASK'] as ItemType[] };
    s = stepSim(s, tap); // entry area: no door/can/pile in range
    // one tick of drain happens before the drink: 0.3 - 1/5400 + 0.5
    expect(s.oil).toBeCloseTo(0.3 + 0.5 - 1 / 5400, 9);
    expect(s.inv).toEqual([]);
    expect(s.events.some((e) => e.type === 'item_use' && e.item === 'FLASK')).toBe(true);
    let u = { ...makeRoomState(1, 0.2), inv: ['FLASK'] as ItemType[] };
    u = stepSim(u, { mx: 0, mz: 0, yawD: 0, interact: false, use: 0 });
    expect(u.oil).toBeCloseTo(0.2 + 0.5 - 1 / 5400, 9);
    expect(u.inv).toEqual([]);
  });

  it('the kit and the purse survive a checkpoint respawn', () => {
    // FLASK (not TONIC/WARD) so the fake door actually kills
    let s = { ...makeRoomState(12, 0.25), inv: ['FLASK'] as ItemType[], coins: 7 };
    // walk into the TALLY fake door at (10.5, 9.6) and die
    for (let i = 0; i < 200; i++) s = stepSim(s, { mx: 0, mz: 1, yawD: 0, interact: false });
    for (let i = 0; i < 100; i++) s = stepSim(s, { mx: 1, mz: 0, yawD: 0, interact: false });
    s = stepSim(s, tap); // the mouth
    expect(s.alive).toBe(false);
    for (let i = 0; i < 95; i++) s = stepSim(s, NOOP); // freeze + respawn at checkpoint 9
    expect(s.door).toBe(9);
    expect(s.deaths).toBe(1);
    expect(s.inv).toEqual(['FLASK']);
    expect(s.coins).toBe(7);
  });
});

describe('Wave 2: STARE + GRIP through stepSim', () => {
  const NOOP: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };
  const move = (n: number, mx: number, mz: number): Frame[] =>
    Array.from({ length: n }, () => ({ mx, mz, yawD: 0, interact: false }));
  // bearing from ENTRY (7,1.5) to STARE's door-6 perch (12.8,5.5)
  const YAW_AT_STARE_6 = 0.9670469933974603;

  it('the sim owns pitch: frame pitchD accumulates and clamps at PITCH_LIMIT', () => {
    let s = makeRoomState(1, 1);
    s = stepSim(s, { mx: 0, mz: 0, yawD: 0, pitchD: 5, interact: false });
    expect(s.player.pitch).toBe(PITCH_LIMIT);
    s = stepSim(s, { mx: 0, mz: 0, yawD: 0, pitchD: -5, interact: false });
    expect(s.player.pitch).toBe(-PITCH_LIMIT);
    // a frame without pitchD holds the view (traces stay valid)
    s = stepSim(s, NOOP);
    expect(s.player.pitch).toBe(-PITCH_LIMIT);
  });

  it('GRIP rooms start with lit sconces (the stand-your-ground counter)', () => {
    expect(makeRoomState(8, 1).sconces).toEqual([true, true, true]);
    expect(makeRoomState(6, 1).sconces).toEqual([false, false, false]); // STARE room: no sconce play
  });

  it('GRIP freezes while the player holds a lit sconce and never closes in', () => {
    let s = makeRoomState(8, 1);
    // lounge lane: 30 NE to x~7.49, then north to the middle sconce at (7,6)
    for (const f of [...move(30, 0.5, 1), ...move(96, 0, 1)]) s = stepSim(s, f);
    expect(Math.hypot(s.player.x - 7, s.player.z - 6)).toBeLessThanOrEqual(1.4);
    for (let i = 0; i < 300; i++) s = stepSim(s, NOOP);
    expect(s.alive).toBe(true);
    const g = s.entities.find((e) => e.kind === 'GRIP');
    expect(g!.phase).toBe('FROZEN');
  });

  it('WARD banishes STARE at the killing stare: terminal phase, banish event', () => {
    let s = { ...makeRoomState(6, 1), player: { ...makeRoomState(6, 1).player, yaw: YAW_AT_STARE_6 }, inv: ['WARD'] as ItemType[] };
    let banished = false;
    for (let i = 0; i < 260 && !banished; i++) {
      s = stepSim(s, NOOP);
      banished = s.events.some((e) => e.type === 'banish' && e.entity === 'STARE');
    }
    expect(banished).toBe(true);
    expect(s.alive).toBe(true);
    expect(s.inv).toEqual([]);
    const st = s.entities.find((e) => e.kind === 'STARE');
    expect(st!.phase).toBe('BANISHED');
    // still staring afterwards is harmless — the eye is gone
    for (let i = 0; i < 200; i++) s = stepSim(s, NOOP);
    expect(s.alive).toBe(true);
  });

  it('TONIC on STARE ends the watch (DEPARTED) and grants grace', () => {
    let s = { ...makeRoomState(6, 1), player: { ...makeRoomState(6, 1).player, yaw: YAW_AT_STARE_6 }, inv: ['TONIC'] as ItemType[] };
    for (let i = 0; i < 230; i++) s = stepSim(s, NOOP); // doomed stare at 226 -> saved
    expect(s.alive).toBe(true);
    expect(s.inv).toEqual([]);
    const st = s.entities.find((e) => e.kind === 'STARE');
    expect(st!.phase).toBe('DEPARTED');
    expect(s.invuln).toBeGreaterThan(0);
  });

  it('WARD banishes GRIP; a TONIC shock shoves it 3 m back instead', () => {
    let s = { ...makeRoomState(8, 1), inv: ['WARD'] as ItemType[] };
    for (let i = 0; i < 400 && s.alive; i++) s = stepSim(s, NOOP); // standing still: doomed at 327
    expect(s.alive).toBe(true);
    const g = s.entities.find((e) => e.kind === 'GRIP');
    expect(g!.phase).toBe('BANISHED');

    let t = { ...makeRoomState(8, 1), inv: ['TONIC'] as ItemType[] };
    for (let i = 0; i < 330; i++) t = stepSim(t, NOOP); // save at 327
    expect(t.alive).toBe(true);
    expect(t.inv).toEqual([]);
    const tg = t.entities.find((e) => e.kind === 'GRIP')!;
    const dist = Math.hypot(tg.x - t.player.x, tg.z - t.player.z);
    expect(dist).toBeGreaterThan(2.5); // shoved back, not banished
  });
});

describe('core purity (source scan)', () => {
  const coreDir = join(__dirname, '..');
  const coreFiles = readdirSync(coreDir).filter((f) => f.endsWith('.ts'));

  it('core files exist (types/schedule/sim/entities/oil/scoring)', () => {
    for (const f of ['types.ts', 'schedule.ts', 'sim.ts', 'entities.ts', 'oil.ts', 'scoring.ts']) {
      expect(coreFiles, f).toContain(f);
    }
  });

  it('no forbidden imports (three/react/zustand/DOM/WebAudio) and no Math.random in core', () => {
    const forbidden = /from ['"](?:three|react|react-dom|zustand)|\bdocument\b|\bwindow\b|\bMath\.random\b|\bperformance\.now\b|\bDate\.now\b|AudioContext/;
    for (const f of coreFiles) {
      const src = readFileSync(join(coreDir, f), 'utf8');
      expect(src, `${f} must stay renderer-independent`).toMatch(/^[\s\S]*$/); // touch file
      expect(forbidden.test(src), `${f} contains a forbidden token`).toBe(false);
    }
  });

  it('core imports nothing outside src/core', () => {
    for (const f of coreFiles) {
      const src = readFileSync(join(coreDir, f), 'utf8');
      const imports = [...src.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const imp of imports) {
        expect(imp, `${f} -> ${imp}`).toMatch(/^(?:\.\.?\/|node:)/);
      }
    }
  });
});
