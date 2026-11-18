// HALLWAKE — minimal zustand UI store (T2 greybox). Carries the kiosk phase,
// the 10Hz HUD snapshot pushed by loop.ts, and a pause flag set when pointer
// lock is released. T4 replaces this file with the full kiosk store; keep
// the field names stable for that swap.

import { create } from 'zustand';
import type { EntityKind } from '../core/types';
import type { HudSnapshot, RunPhase } from '../render/loop';

export type Phase = 'attract' | RunPhase;

export interface UIState {
  phase: Phase;
  paused: boolean;
  hud: HudSnapshot;
  scores: unknown[]; // T4 fills the leaderboard
  setPhase(p: Phase): void;
  setPaused(v: boolean): void;
  setHud(h: HudSnapshot): void;
}

export const useUIStore = create<UIState>((set) => ({
  phase: 'attract',
  paused: false,
  hud: { door: 1, doorLog: 2, oil: 1, alive: true, tellKind: null },
  scores: [],
  setPhase: (p) => set((s) => (s.phase === p ? s : { phase: p })),
  setPaused: (v) => set((s) => (s.paused === v ? s : { paused: v })),
  setHud: (h) => set({ hud: h }),
}));
