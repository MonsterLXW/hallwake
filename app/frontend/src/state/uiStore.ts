// HALLWAKE — the kiosk store (T4; replaces the T2 greybox). zustand holds
// the phase machine (attract -> playing -> paused/dead/run -> attract),
// the 10 Hz HUD snapshot pushed by loop.ts, the run card, the leaderboard
// rows, and the display-only flavor lines. The sim never reads this store;
// the loop writes snapshots one way. Kiosk contract: 30 s of no input
// returns the booth to attract and the next input starts a fresh run.

import { create } from 'zustand';
import type { HudSnapshot } from '../render/loop';
import type { RunCard } from '../core/scoring';
import type { ScoreRow } from '../net/scoresClient';
import type { Difficulty } from '../core/progression';

export type Phase = 'attract' | 'playing' | 'paused' | 'dead' | 'run';

// Safe rooms carrying lore (architecture.md §4: doors 3, 11, 20).
export const LORE_DOORS: ReadonlySet<number> = new Set([3, 11, 20]);

const IDLE_MS = 30_000; // kiosk auto-reset to attract (brief §6)
const LORE_MS = 4_000; // LoreCard auto-dismiss (T4 spec)

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let loreTimer: ReturnType<typeof setTimeout> | null = null;
let lastMarkAt = 0;

// The 30 s kiosk countdown must be running in EVERY non-attract phase: a
// player who dies or finishes and then walks away (no further input events)
// still returns to attract. Input re-arms it via markActivity.
function armIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  lastMarkAt = Date.now();
  idleTimer = setTimeout(() => useUIStore.getState().setPhase('attract'), IDLE_MS);
}

export interface UIState {
  phase: Phase;
  hud: HudSnapshot;
  runCard: RunCard | null;
  scores: ScoreRow[];
  scoresSource: 'server' | 'local';
  flavorText: string | null; // LoreCard line
  epitaph: string | null; // DeathCard line
  runFlavor: string | null; // RunCard line
  seed: number; // run id for the leaderboard POST
  difficulty: Difficulty; // Wave 3: attract-screen mode, survives the attract wipe
  setPhase(p: Phase): void;
  setHud(h: HudSnapshot): void;
  setRunCard(c: RunCard | null): void;
  setScores(rows: ScoreRow[], source: 'server' | 'local'): void;
  setLore(text: string): void;
  setEpitaph(text: string | null): void;
  setRunFlavor(text: string | null): void;
  setSeed(n: number): void;
  setDifficulty(d: Difficulty): void;
  markActivity(): void;
}

const INITIAL_HUD: HudSnapshot = {
  door: 1,
  doorLog: 2,
  oil: 1,
  alive: true,
  tellKind: null,
  interactPrompt: null,
  checkpoint: 1,
  deaths: 0,
  runMs: 0,
  deepest: 1,
  inv: [],
  coins: 0,
  locked: false,
  hidden: false,
  stareAt: false,
  xp: 0,
  level: 0,
  perks: [],
  perkPending: false,
  difficulty: 'NORMAL',
};

export const useUIStore = create<UIState>((set, get) => ({
  phase: 'attract',
  hud: INITIAL_HUD,
  runCard: null,
  scores: [],
  scoresSource: 'local',
  flavorText: null,
  epitaph: null,
  runFlavor: null,
  seed: 0,
  difficulty: 'NORMAL',

  setPhase: (p) => {
    if (get().phase === p) return;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (p === 'attract') {
      if (loreTimer) {
        clearTimeout(loreTimer);
        loreTimer = null;
      }
      lastMarkAt = 0;
      // attract wipes the run: the booth forgets everything but the ledger
      set({ phase: p, runCard: null, flavorText: null, epitaph: null, runFlavor: null });
    } else {
      set({ phase: p });
      armIdleTimer(); // kiosk contract: the idle countdown runs in every live phase
    }
  },

  setHud: (h) => set({ hud: h }),
  setRunCard: (c) => set({ runCard: c }),
  setScores: (rows, source) => set({ scores: rows, scoresSource: source }),

  setLore: (text) => {
    if (loreTimer) clearTimeout(loreTimer);
    set({ flavorText: text });
    loreTimer = setTimeout(() => set({ flavorText: null }), LORE_MS);
  },

  setEpitaph: (text) => set({ epitaph: text }),
  setRunFlavor: (text) => set({ runFlavor: text }),
  setSeed: (n) => set({ seed: n }),
  // Wave 3: the booth's difficulty is a setting, not run state — the attract
  // wipe deliberately keeps it (the next porter picks up where the last left).
  setDifficulty: (d) => set({ difficulty: d }),

  markActivity: () => {
    if (get().phase === 'attract') return;
    // called from key/pointer listeners AND every non-zero input frame
    // (gamepad included, via loop.ts onActivity) at up to 60 Hz: re-arm at
    // most once per second — 1 s granularity is plenty for a 30 s window.
    if (Date.now() - lastMarkAt < 1000) return;
    armIdleTimer();
  },
}));
