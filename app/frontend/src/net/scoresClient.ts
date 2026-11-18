// HALLWAKE — leaderboard client (architecture.md §9/§10). GET/POST
// /api/scores with the §10 shapes; on any network failure the kiosk reads
// and writes a localStorage mirror ('hallwake.scores.local', last 20) so
// the booth works with the backend down. Client-side validation mirrors
// core/scoring.ts (and the server) so a bad name never leaves the device.
// This module must never import core/sim (enforced by clients.test).

import { validateScore, type ScoreInput } from '../core/scoring';

export interface ScoreRow {
  id: number;
  name: string;
  deepest_door: number;
  run_time_ms: number;
  deaths: number;
  created_at: string;
}

export interface SubmitResult {
  ok: boolean;
  rank?: number;
  local?: boolean; // true when the row was kept in the local mirror
  error?: string;
}

export const LS_KEY = 'hallwake.scores.local';
export const LS_MAX = 20;

function lsStore(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // privacy modes throw on access
  }
}

export function readLocalScores(): ScoreRow[] {
  const store = lsStore();
  if (!store) return [];
  try {
    const raw = store.getItem(LS_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is ScoreRow =>
        !!r &&
        typeof (r as ScoreRow).name === 'string' &&
        typeof (r as ScoreRow).deepest_door === 'number',
    );
  } catch {
    return [];
  }
}

// Rank order mirrors idx_scores_rank: door DESC, time ASC, deaths ASC.
export function rankLocal(rows: ScoreRow[]): ScoreRow[] {
  return [...rows].sort(
    (a, b) =>
      b.deepest_door - a.deepest_door ||
      a.run_time_ms - b.run_time_ms ||
      a.deaths - b.deaths,
  );
}

function writeLocalScores(rows: ScoreRow[]): void {
  const store = lsStore();
  if (!store) return;
  try {
    store.setItem(LS_KEY, JSON.stringify(rows.slice(0, LS_MAX)));
  } catch {
    /* quota / privacy mode: the kiosk just shows fewer rows */
  }
}

export async function getScores(
  limit = 10,
): Promise<{ scores: ScoreRow[]; source: 'server' | 'local' }> {
  const n = Math.max(1, Math.min(50, limit));
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(`/api/scores?limit=${n}`);
      if (res.ok) {
        const data = (await res.json()) as { scores?: unknown };
        if (Array.isArray(data.scores)) {
          return { scores: data.scores as ScoreRow[], source: 'server' };
        }
      }
    } catch {
      /* fall through to the mirror */
    }
  }
  return { scores: rankLocal(readLocalScores()).slice(0, n), source: 'local' };
}

export async function submitScore(input: ScoreInput, seed: number): Promise<SubmitResult> {
  const v = validateScore(input);
  if (!v.ok) return { ok: false, error: v.error };

  const mirror: ScoreRow = {
    id: Date.now(),
    name: input.name,
    deepest_door: input.deepest_door,
    run_time_ms: input.run_time_ms,
    deaths: input.deaths,
    created_at: new Date().toISOString(),
  };

  if (typeof fetch === 'function') {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, seed }),
      });
      if (res.ok) {
        const data = (await res.json()) as { rank?: unknown };
        writeLocalScores([mirror, ...readLocalScores()]); // keep the mirror warm
        return { ok: true, rank: typeof data.rank === 'number' ? data.rank : undefined };
      }
      if (res.status === 422) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        return { ok: false, error: typeof data.error === 'string' ? data.error : 'rejected' };
      }
    } catch {
      /* network down: the mirror below carries the run */
    }
  }
  writeLocalScores([mirror, ...readLocalScores()]);
  return { ok: false, local: true };
}
