// HALLWAKE — client-side validation must mirror architecture.md §10 exactly
// (same rules the FastAPI server enforces), so the kiosk never posts a row
// the backend would reject.

import { describe, expect, it } from 'vitest';
import { runCardFrom, validateScore, type ScoreInput } from '../../core/scoring';
import { createInitialState } from '../../core/sim';

const base: ScoreInput = {
  name: 'PORTER 7',
  deepest_door: 24,
  run_time_ms: 120_000,
  deaths: 3,
};

const withOver = (over: Partial<ScoreInput>): ScoreInput => ({ ...base, ...over });

describe('validateScore (client mirror of §10)', () => {
  it('accepts a well-formed card', () => {
    expect(validateScore(base).ok).toBe(true);
  });

  it('accepts the full legal charset and edges', () => {
    expect(validateScore(withOver({ name: "O'Brien Jr." })).ok).toBe(true);
    expect(validateScore(withOver({ name: 'A' })).ok).toBe(true);
    expect(validateScore(withOver({ deepest_door: 1, run_time_ms: 10_000, deaths: 0 })).ok).toBe(true);
    expect(validateScore(withOver({ deepest_door: 24, run_time_ms: 1_800_000, deaths: 99 })).ok).toBe(true);
  });

  it('rejects a 13-char name', () => {
    const r = validateScore(withOver({ name: 'abcdefghijklm' }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('name');
  });

  it('rejects empty and illegal-character names', () => {
    expect(validateScore(withOver({ name: '' })).ok).toBe(false);
    expect(validateScore(withOver({ name: 'bad"name' })).ok).toBe(false);
    expect(validateScore(withOver({ name: 'naïve' })).ok).toBe(false);
  });

  it('rejects door 25, door 0 and non-integers', () => {
    expect(validateScore(withOver({ deepest_door: 25 })).ok).toBe(false);
    expect(validateScore(withOver({ deepest_door: 0 })).ok).toBe(false);
    expect(validateScore(withOver({ deepest_door: 12.5 })).ok).toBe(false);
  });

  it('rejects runMs 9999 and 1800001', () => {
    expect(validateScore(withOver({ run_time_ms: 9_999 })).ok).toBe(false);
    expect(validateScore(withOver({ run_time_ms: 1_800_001 })).ok).toBe(false);
  });

  it('rejects deaths 100 and -1', () => {
    expect(validateScore(withOver({ deaths: 100 })).ok).toBe(false);
    expect(validateScore(withOver({ deaths: -1 })).ok).toBe(false);
  });
});

describe('runCardFrom', () => {
  it('projects the sim state into the §10 card shape', () => {
    const card = runCardFrom(createInitialState(42));
    expect(card).toEqual({ deepest_door: 1, run_time_ms: 0, deaths: 0 });
  });
});
