// HALLWAKE — kiosk idle-reset contract (idea.md §2, architecture.md §6):
// "attract screen after 30 s idle". QA regression: the countdown must be
// armed by EVERY phase entry (not only by key/pointer input), so a player
// who dies or finishes and walks away with hands off the controls still
// returns the booth to attract.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../uiStore';

const IDLE_MS = 30_000;

beforeEach(() => {
  vi.useFakeTimers();
  useUIStore.getState().setPhase('attract');
});

afterEach(() => {
  useUIStore.getState().setPhase('attract');
  vi.useRealTimers();
});

const phase = () => useUIStore.getState().phase;

describe('kiosk idle reset', () => {
  it('phase entry alone arms the 30 s countdown (walk-away after finish)', () => {
    useUIStore.getState().setPhase('playing');
    useUIStore.getState().setPhase('run'); // run ends; player walks away
    expect(phase()).toBe('run');
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(phase()).toBe('run');
    vi.advanceTimersByTime(1);
    expect(phase()).toBe('attract');
  });

  it('death phase also arms the countdown (walk-away after dying)', () => {
    useUIStore.getState().setPhase('playing');
    useUIStore.getState().setPhase('dead');
    vi.advanceTimersByTime(IDLE_MS);
    expect(phase()).toBe('attract');
  });

  it('markActivity defers the reset', () => {
    useUIStore.getState().setPhase('playing');
    vi.advanceTimersByTime(20_000);
    useUIStore.getState().markActivity();
    vi.advanceTimersByTime(20_000); // 40 s since entry, 20 s since activity
    expect(phase()).toBe('playing');
    vi.advanceTimersByTime(10_000);
    expect(phase()).toBe('attract');
  });

  it('attract ignores markActivity (no timer churn on the idle screen)', () => {
    useUIStore.getState().markActivity();
    vi.advanceTimersByTime(IDLE_MS + 1000);
    expect(phase()).toBe('attract');
  });

  it('returning to attract wipes the run but keeps the ledger', () => {
    useUIStore.getState().setPhase('playing');
    useUIStore.getState().setRunCard({ deepest_door: 24, run_time_ms: 60_000, deaths: 0 });
    useUIStore.getState().setScores(
      [{ id: 1, name: 'QA', deepest_door: 24, run_time_ms: 60_000, deaths: 0, created_at: 'x' }],
      'server',
    );
    vi.advanceTimersByTime(IDLE_MS);
    expect(phase()).toBe('attract');
    expect(useUIStore.getState().runCard).toBeNull();
    expect(useUIStore.getState().scores).toHaveLength(1);
  });
});
