// Golden-trace runner + determinism proof + core purity source scan.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState, makeRoomState, stepSim } from '../sim';
import type { SimState } from '../types';
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
      s = stepSim(s, { mx: 0, mz: 0, yawD: 0, interact: true });
    }
    expect(s.door).toBe(5);
    expect(s.checkpoint).toBe(5);
    expect(s.events.some((e) => e.type === 'checkpoint' && e.door === 5)).toBe(true);
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
