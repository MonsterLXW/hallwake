// HALLWAKE — Wave 3: XP, perks, difficulty. Determinism proofs + the effect
// of every perk and every difficulty knob, hand-computed from the constants
// in core/progression.ts. Normal + no perks must reproduce the shipped
// golden traces exactly.

import { describe, it, expect } from 'vitest';
import { createInitialState, makeRoomState, stepSim, WALK_SPEED } from '../sim';
import {
  DIFFICULTY_MODS,
  FASTER_WALK_MULT,
  IRON_NERVE_REACT,
  LANTERN_PERK_BONUS,
  NEUTRAL_ENTITY_MODS,
  PERK_ORDER,
  XP_BANISH,
  XP_DOOR,
  XP_LEVEL_THRESHOLDS,
  XP_LOOT,
  checkpointDoors,
  entityMods,
  perkChoices,
  xpLevel,
  type Difficulty,
  type PerkId,
} from '../progression';
import { lanternRadius } from '../oil';
import { CHECKPOINT_DOORS } from '../schedule';
import type { Frame, ItemType } from '../types';
import { TRACES } from './traces';

const NOOP: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };
const tap: Frame = { mx: 0, mz: 0, yawD: 0, interact: true };
const north = (n: number): Frame[] => Array.from({ length: n }, () => ({ mx: 0, mz: 1, yawD: 0, interact: false }));
const east = (n: number): Frame[] => Array.from({ length: n }, () => ({ mx: 1, mz: 0, yawD: 0, interact: false }));

// bearing from ENTRY (7,1.5) to STARE's door-6 perch (12.8,5.5)
const YAW_AT_STARE_6 = 0.9670469933974603;

function runTrace(name: string, difficulty: Difficulty = 'NORMAL', perks: PerkId[] = []) {
  const t = TRACES.find((x) => x.name === name)!;
  let s = makeRoomState(t.start.door, t.start.oil, difficulty, perks);
  if (t.start.yaw !== undefined) s = { ...s, player: { ...s.player, yaw: t.start.yaw } };
  for (const f of t.frames) s = stepSim(s, f);
  return s;
}

describe('XP accrual (fixed events only, no RNG)', () => {
  it('banks XP per door survived, per loot pickup, per banish', () => {
    let s = makeRoomState(1, 1);
    for (const f of north(260)) s = stepSim(s, f);
    s = stepSim(s, tap); // open door 2
    expect(s.door).toBe(2);
    expect(s.xp).toBe(XP_DOOR);

    let l = makeRoomState(2, 1); // TONIC pile at (12,3)
    for (const f of north(41)) l = stepSim(l, f);
    for (const f of east(135)) l = stepSim(l, f);
    l = stepSim(l, tap);
    expect(l.inv).toEqual(['TONIC']);
    expect(l.xp).toBe(XP_LOOT);

    let w = { ...makeRoomState(7, 1), inv: ['WARD'] as ItemType[] };
    for (let i = 0; i < 565; i++) w = stepSim(w, NOOP); // WARD banishes the doomed sweep at 565
    expect(w.alive).toBe(true);
    expect(w.xp).toBe(XP_BANISH);
  });

  it('golden traces bank exactly the XP their events imply', () => {
    expect(runTrace('gaunt7_survive').xp).toBe(0); // survived, but no door/banish/loot
    expect(runTrace('cinder9_relight_order').xp).toBe(XP_BANISH); // one CINDER banish
    expect(runTrace('grip8_reach_exit_survive').xp).toBe(XP_DOOR); // one door opened
    expect(runTrace('murmur10_oil_out_death').xp).toBe(0); // respawn is not a door survived
  });

  it('the same input stream produces byte-identical state twice (XP included)', () => {
    const run = () => {
      let s = createInitialState(42, 'HARD');
      for (const f of north(260)) s = stepSim(s, f);
      s = stepSim(s, tap);
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });

  it('xpLevel counts the cumulative thresholds', () => {
    expect(xpLevel(0)).toBe(0);
    expect(xpLevel(39)).toBe(0);
    expect(xpLevel(40)).toBe(1);
    expect(xpLevel(99)).toBe(1);
    expect(xpLevel(100)).toBe(2);
    expect(xpLevel(180)).toBe(3);
    expect(XP_LEVEL_THRESHOLDS).toEqual([40, 100, 180]);
  });

  it('XP and chosen perks survive a checkpoint respawn', () => {
    let s = { ...makeRoomState(12, 0.25, 'NORMAL', ['PROSPECT'] as PerkId[]), xp: 40 };
    for (const f of north(200)) s = stepSim(s, f);
    for (const f of east(100)) s = stepSim(s, f);
    s = stepSim(s, tap); // the TALLY fake door mouth
    expect(s.alive).toBe(false);
    for (let i = 0; i < 95; i++) s = stepSim(s, NOOP); // freeze + respawn at checkpoint 9
    expect(s.door).toBe(9);
    expect(s.xp).toBe(40);
    expect(s.perks).toEqual(['PROSPECT']);
  });
});

describe('perk picks (deterministic offers, single application)', () => {
  it('perkChoices is deterministic, excludes chosen perks, offers 2-3', () => {
    const first = perkChoices([]);
    expect(first).toEqual(perkChoices([]));
    expect(first).toHaveLength(3);
    const second = perkChoices([first[0]]);
    expect(second).toHaveLength(3);
    expect(second).not.toContain(first[0]);
    const third = perkChoices([...first]);
    expect(third).toHaveLength(2);
    for (const p of third) expect(first).not.toContain(p);
    expect(perkChoices([...PERK_ORDER])).toEqual([]);
  });

  it('a level-up perk frame applies once, only from the offered list', () => {
    let s = { ...makeRoomState(1, 1), xp: XP_LEVEL_THRESHOLDS[0] };
    const offered = perkChoices([]);
    const notOffered = PERK_ORDER.find((p) => !offered.includes(p))!;
    s = stepSim(s, { ...NOOP, perk: notOffered }); // refused: not on this level's plate
    expect(s.perks).toEqual([]);
    s = stepSim(s, { ...NOOP, perk: offered[0] });
    expect(s.perks).toEqual([offered[0]]);
    expect(s.events.some((e) => e.type === 'perk' && e.perk === offered[0])).toBe(true);
    // EXTRA_TONIC was offered[0]: the kit gains the tonic immediately
    expect(s.inv).toEqual(['TONIC']);
    // a second pick before the next threshold is refused
    s = stepSim(s, { ...NOOP, perk: perkChoices(s.perks)[0] });
    expect(s.perks).toHaveLength(1);
  });

  it('EXTRA_TONIC starts the run with a tonic; PROSPECT is stored for Wave 4', () => {
    expect(createInitialState(1, 'NORMAL', ['EXTRA_TONIC']).inv).toEqual(['TONIC']);
    expect(createInitialState(1).inv).toEqual([]);
    const s = createInitialState(1, 'HELL', ['PROSPECT']);
    expect(s.perks).toEqual(['PROSPECT']);
    expect(s.difficulty).toBe('HELL');
  });

  it('BRIGHT_LANTERN adds its radius to the lantern', () => {
    expect(lanternRadius(1)).toBe(8);
    expect(lanternRadius(1, LANTERN_PERK_BONUS)).toBe(9.5);
    expect(LANTERN_PERK_BONUS).toBe(1.5);
  });

  it('FASTER_WALK moves the player farther per tick (small multiplier)', () => {
    let a = makeRoomState(1, 1);
    let b = { ...makeRoomState(1, 1), perks: ['FASTER_WALK'] as PerkId[] };
    for (const f of east(120)) {
      a = stepSim(a, f);
      b = stepSim(b, f);
    }
    expect(a.player.x).toBeCloseTo(7 + (120 * WALK_SPEED) / 60, 6);
    expect(b.player.x).toBeCloseTo(7 + (120 * WALK_SPEED * FASTER_WALK_MULT) / 60, 6);
    expect(b.player.x).toBeGreaterThan(a.player.x);
  });

  it('IRON_NERVE delays the GAUNT sweep: alive where Normal dies', () => {
    let a = makeRoomState(7, 1);
    for (let i = 0; i < 565; i++) a = stepSim(a, NOOP); // Normal: doomed at 565
    expect(a.alive).toBe(false);
    let b = { ...makeRoomState(7, 1), perks: ['IRON_NERVE'] as PerkId[] };
    for (let i = 0; i < 565; i++) b = stepSim(b, NOOP); // sweep now starts at 60 + round(145*1.3) = 249
    expect(b.alive).toBe(true);
    for (let i = 0; i < 60; i++) b = stepSim(b, NOOP); // past the resolve at 609
    expect(b.alive).toBe(false);
  });

  it('entityMods stacks IRON_NERVE on the react axis only', () => {
    expect(entityMods('NORMAL', [])).toEqual(NEUTRAL_ENTITY_MODS);
    const m = entityMods('HELL', ['IRON_NERVE']);
    expect(m.react).toBeCloseTo(DIFFICULTY_MODS.HELL.react * IRON_NERVE_REACT, 9);
    expect(m.gripSpeed).toBe(DIFFICULTY_MODS.HELL.gripSpeed);
  });
});

describe('difficulty modes (pure multipliers, deterministic)', () => {
  it('Normal checkpoint spacing is the shipped schedule table', () => {
    expect(checkpointDoors('NORMAL')).toEqual([...CHECKPOINT_DOORS]);
    expect(checkpointDoors('EASY')).toEqual([1, 4, 7, 10, 13, 16, 19, 22]);
    expect(checkpointDoors('HARD')).toEqual([1, 7, 13, 19]);
    expect(checkpointDoors('HELL')).toEqual([1, 13]);
  });

  it('oil drain scales with difficulty: exact values after 600 ticks', () => {
    const oilAfter = (d: Difficulty, n: number) => {
      let s = makeRoomState(1, 1, d);
      for (let i = 0; i < n; i++) s = stepSim(s, NOOP);
      return s.oil;
    };
    expect(oilAfter('NORMAL', 600)).toBeCloseTo(1 - 600 / 5400, 9);
    expect(oilAfter('EASY', 600)).toBeCloseTo(1 - (600 * DIFFICULTY_MODS.EASY.oilDrain) / 5400, 9);
    expect(oilAfter('HARD', 600)).toBeCloseTo(1 - (600 * DIFFICULTY_MODS.HARD.oilDrain) / 5400, 9);
    expect(oilAfter('HELL', 600)).toBeCloseTo(1 - (600 * DIFFICULTY_MODS.HELL.oilDrain) / 5400, 9);
    expect(oilAfter('HELL', 600)).toBeLessThan(oilAfter('NORMAL', 600));
    expect(oilAfter('EASY', 600)).toBeGreaterThan(oilAfter('NORMAL', 600));
  });

  it('checkpoint spacing changes where a door-12 death respawns', () => {
    const dieAt12 = (d: Difficulty) => {
      let s = makeRoomState(12, 0.25, d);
      for (const f of north(200)) s = stepSim(s, f);
      for (const f of east(100)) s = stepSim(s, f);
      s = stepSim(s, tap); // the fake door mouth
      for (let i = 0; i < 95; i++) s = stepSim(s, NOOP); // freeze + respawn
      return s;
    };
    expect(dieAt12('NORMAL').door).toBe(9); // shipped behavior
    expect(dieAt12('EASY').door).toBe(10);
    expect(dieAt12('HARD').door).toBe(7);
    expect(dieAt12('HELL').door).toBe(1);
    expect(dieAt12('HARD').checkpoint).toBe(7);
  });

  it('the STARE react window moves with difficulty: exact death ticks while staring', () => {
    const stareDeathTick = (d: Difficulty) => {
      let s = makeRoomState(6, 1, d);
      s = { ...s, player: { ...s.player, yaw: YAW_AT_STARE_6 } };
      for (let t = 1; t <= 400; t++) {
        s = stepSim(s, NOOP);
        if (!s.alive) return t;
      }
      return -1;
    };
    // Normal: check 180, grace 45 -> 226 (the golden trace value)
    expect(stareDeathTick('NORMAL')).toBe(226);
    // EASY: check 60+150=210, grace round(56.25)=56 -> 267
    expect(stareDeathTick('EASY')).toBe(267);
    // HARD: check 60+108=168, grace round(40.5)=41 -> 210
    expect(stareDeathTick('HARD')).toBe(210);
    // HELL: check 60+96=156, grace 36 -> 193
    expect(stareDeathTick('HELL')).toBe(193);
  });

  it('GRIP closing speed scales with difficulty', () => {
    const gripDeathTick = (d: Difficulty) => {
      let s = makeRoomState(8, 1, d);
      for (let t = 1; t <= 600; t++) {
        s = stepSim(s, NOOP);
        if (!s.alive) return t;
      }
      return -1;
    };
    expect(gripDeathTick('NORMAL')).toBe(327); // the golden trace value
    expect(gripDeathTick('HELL')).toBeLessThan(327);
    expect(gripDeathTick('EASY')).toBeGreaterThan(327);
  });

  it('Normal + no perks reproduces the gaunt7_survive golden trace exactly', () => {
    const t = TRACES.find((x) => x.name === 'gaunt7_survive')!;
    const s = runTrace('gaunt7_survive', 'NORMAL', []);
    expect(s.alive).toBe(t.expect.alive);
    expect(s.door).toBe(t.expect.door);
    expect(Math.floor(s.oil / 0.05 + 1e-9)).toBe(t.expect.oilBand);
    expect(s.entities.find((e) => e.kind === 'GAUNT')!.phase).toBe('SURVIVED');
    expect(s.xp).toBe(0);
    expect(s.perks).toEqual([]);
  });
});
