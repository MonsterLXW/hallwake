// HALLWAKE — run card + leaderboard validation. Mirrors the backend rules
// (architecture.md §10) exactly so client and server never disagree.

import type { SimState } from './types';

export interface RunCard {
  deepest_door: number;
  run_time_ms: number;
  deaths: number;
}

export interface ScoreInput extends RunCard {
  name: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const NAME_RE = /^[A-Za-z0-9 .'-]{1,12}$/;

export function runCardFrom(state: SimState): RunCard {
  return {
    deepest_door: state.deepest,
    run_time_ms: Math.round(state.runMs),
    deaths: state.deaths,
  };
}

export function validateScore(input: ScoreInput): ValidationResult {
  if (typeof input.name !== 'string' || !NAME_RE.test(input.name)) {
    return { ok: false, error: "name must be 1-12 chars of [A-Za-z0-9 .'-]" };
  }
  if (!Number.isInteger(input.deepest_door) || input.deepest_door < 1 || input.deepest_door > 24) {
    return { ok: false, error: 'deepest_door must be an integer 1..24' };
  }
  if (!Number.isInteger(input.run_time_ms) || input.run_time_ms < 10000 || input.run_time_ms > 1800000) {
    return { ok: false, error: 'run_time_ms must be an integer 10000..1800000' };
  }
  if (!Number.isInteger(input.deaths) || input.deaths < 0 || input.deaths > 99) {
    return { ok: false, error: 'deaths must be an integer 0..99' };
  }
  return { ok: true };
}
