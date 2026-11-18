// HALLWAKE — Wave 3 progression: XP, perk picks, difficulty multipliers
// (features.md). Pure table data + pure functions: no RNG, no DOM. The sim
// reads these values every tick; the renderer never mutates them. Normal
// difficulty is the shipped baseline — every multiplier 1 and the checkpoint
// set identical to schedule.CHECKPOINT_DOORS — so the golden traces run
// unchanged there.

import { CHECKPOINT_DOORS } from './schedule';

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'HELL';

export interface DifficultyMods {
  oilDrain: number; // multiplier on OIL_DRAIN_PER_TICK
  react: number; // multiplier on tell -> lethal lead windows (GAUNT lead, STARE lead + grace, MURMUR step cadence)
  gripSpeed: number; // multiplier on GRIP_SPEED (chase pressure)
  checkpoints: number[]; // door numbers that hold a checkpoint at this difficulty
}

// HELL react 0.8 keeps every GAUNT alcove reachable from ENTRY (sweep at
// roomTick 176 = 6.45 m of walk vs 6.1 m to the far edge of door 7's alcove)
// and every GRIP door outrunnable — brutal margins, never unfair by
// construction. The schedule.test reachability invariants guard Normal.
export const DIFFICULTY_MODS: Record<Difficulty, DifficultyMods> = {
  EASY: { oilDrain: 0.8, react: 1.25, gripSpeed: 0.85, checkpoints: [1, 4, 7, 10, 13, 16, 19, 22] },
  NORMAL: { oilDrain: 1, react: 1, gripSpeed: 1, checkpoints: [...CHECKPOINT_DOORS] },
  HARD: { oilDrain: 1.3, react: 0.9, gripSpeed: 1.15, checkpoints: [1, 7, 13, 19] },
  HELL: { oilDrain: 1.6, react: 0.8, gripSpeed: 1.3, checkpoints: [1, 13] },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['EASY', 'NORMAL', 'HARD', 'HELL'];

export function checkpointDoors(d: Difficulty): number[] {
  return DIFFICULTY_MODS[d].checkpoints;
}

// --- XP: earned only from fixed events (door survived / banish / loot) -----
export const XP_DOOR = 10;
export const XP_BANISH = 15;
export const XP_LOOT = 5;

// Cumulative thresholds: three perk picks per full run (a clean 24-door run
// banks ~300 XP). Level = how many thresholds the XP has passed.
export const XP_LEVEL_THRESHOLDS = [40, 100, 180];

export function xpLevel(xp: number): number {
  let n = 0;
  for (const t of XP_LEVEL_THRESHOLDS) if (xp >= t) n++;
  return n;
}

// --- Perks ------------------------------------------------------------------
export type PerkId = 'EXTRA_TONIC' | 'BRIGHT_LANTERN' | 'PROSPECT' | 'FASTER_WALK' | 'IRON_NERVE';

export const PERK_ORDER: PerkId[] = ['EXTRA_TONIC', 'BRIGHT_LANTERN', 'PROSPECT', 'FASTER_WALK', 'IRON_NERVE'];

// Deterministic offer: the unchosen perks in canonical order, rotated by the
// pick index, cut to three (two when only two remain). Same chosen set ->
// same choices, every run, no RNG.
export function perkChoices(chosen: PerkId[]): PerkId[] {
  const remaining = PERK_ORDER.filter((p) => !chosen.includes(p));
  if (remaining.length === 0) return [];
  const rot = chosen.length % remaining.length;
  const rotated = [...remaining.slice(rot), ...remaining.slice(0, rot)];
  return rotated.slice(0, Math.min(3, rotated.length));
}

// Perk effect constants — pure multipliers the sim / renderer apply.
export const FASTER_WALK_MULT = 1.12; // WALK_SPEED x1.12 (small, no sprint)
export const IRON_NERVE_REACT = 1.3; // react windows x1.3 on top of difficulty
export const LANTERN_PERK_BONUS = 1.5; // +1.5 m lantern radius (renderer)

// Entity-side multipliers: difficulty react/gripSpeed, with IRON_NERVE
// stacking on the react axis only. Normal + no perks = neutral, so every
// existing trace and FSM unit test runs the shipped numbers.
export interface EntityMods {
  react: number;
  gripSpeed: number;
}

export const NEUTRAL_ENTITY_MODS: EntityMods = { react: 1, gripSpeed: 1 };

export function entityMods(difficulty: Difficulty, perks: PerkId[]): EntityMods {
  const m = DIFFICULTY_MODS[difficulty];
  const react = perks.includes('IRON_NERVE') ? m.react * IRON_NERVE_REACT : m.react;
  return { react, gripSpeed: m.gripSpeed };
}
