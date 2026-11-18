// HALLWAKE — net client contracts (T4 spec): flavor aborts at 800 ms and
// falls back to canned; score POST failures write the localStorage mirror;
// and the flavor firewall holds headlessly — nothing in src/net may import
// core/sim, so fetched text can never reach stepSim.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchFlavor, sanitizeText } from '../flavorClient';
import { LS_KEY, getScores, readLocalScores, submitScore, type ScoreRow } from '../scoresClient';
import { pickLine } from '../canned';

const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);

function makeLocalStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('flavorClient', () => {
  it('aborts at 800 ms and falls back to the canned pool', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      (_url: unknown, init: { signal: AbortSignal }) =>
        new Promise((_res, rej) => {
          init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const p = fetchFlavor({ kind: 'lore', door: 3 });
    await vi.advanceTimersByTimeAsync(800);
    const r = await p;
    expect(r.source).toBe('local');
    expect(r.text).toBe(pickLine('lore', 3));
  });

  it('sanitizes server text (tags, control chars, whitespace, 240 cap)', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        available: true,
        source: 'llm',
        text: '<b>eerie</b>\n\nhall' + NUL + 'way  hum ' + 'x'.repeat(300),
      }),
    }));
    const r = await fetchFlavor({ kind: 'lore', door: 1 });
    expect(r.source).toBe('llm');
    expect(r.text.startsWith('eerie hall way hum')).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(240);
    expect(r.text).not.toMatch(/[<>]/);
    expect(r.text).not.toMatch(/\p{Cc}/u);
  });

  it('falls back to canned on 5xx and on empty text', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 502, json: async () => ({}) }));
    let r = await fetchFlavor({ kind: 'epitaph', door: 7 });
    expect(r.source).toBe('local');
    expect(r.text).toBe(pickLine('epitaph', 7));

    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ source: 'llm', text: '   ' }) }));
    r = await fetchFlavor({ kind: 'run', door: 24 });
    expect(r.source).toBe('local');
    expect(r.text).toBe(pickLine('run', 24));
  });

  it('sanitizeText collapses a hostile payload to one safe line', () => {
    expect(sanitizeText('<script>alert(1)</script>   quiet' + BEL + ' night')).toBe(
      'alert(1) quiet night',
    );
  });
});

describe('scoresClient', () => {
  const row: ScoreRow = {
    id: 1,
    name: 'PORTER 1',
    deepest_door: 12,
    run_time_ms: 60_000,
    deaths: 2,
    created_at: '2026-11-18T00:00:00Z',
  };

  it('GET returns server rows when the backend is up', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ scores: [row] }) }));
    const r = await getScores(5);
    expect(r.source).toBe('server');
    expect(r.scores).toEqual([row]);
  });

  it('GET falls back to the localStorage mirror when the backend is down', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    localStorage.setItem(LS_KEY, JSON.stringify([row]));
    const r = await getScores(5);
    expect(r.source).toBe('local');
    expect(r.scores[0]?.name).toBe('PORTER 1');
  });

  it('POST failure writes the localStorage mirror (kiosk works offline)', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    const res = await submitScore(
      { name: 'OFFLINE P', deepest_door: 9, run_time_ms: 45_000, deaths: 1 },
      12345,
    );
    expect(res.ok).toBe(false);
    expect(res.local).toBe(true);
    const mirror = readLocalScores();
    expect(mirror[0]?.name).toBe('OFFLINE P');
  });

  it('POST rejects client-side before any fetch for invalid names', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const res = await submitScore(
      { name: 'abcdefghijklm', deepest_door: 9, run_time_ms: 45_000, deaths: 1 },
      1,
    );
    expect(res.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(readLocalScores()).toEqual([]);
  });

  it('POST 422 surfaces the server error and does not mirror', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 422,
      json: async () => ({ ok: false, error: 'seed must be an integer' }),
    }));
    // a non-integer seed passes the client card rules but the server rejects
    const res = await submitScore(
      { name: 'SEEDLESS', deepest_door: 12, run_time_ms: 45_000, deaths: 0 },
      1.5,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe('seed must be an integer');
    expect(readLocalScores()).toEqual([]);
  });

  it('mirror keeps only the last 20 rows', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    for (let i = 0; i < 25; i++) {
      await submitScore(
        { name: `P${i}`, deepest_door: (i % 24) + 1, run_time_ms: 10_000 + i, deaths: 0 },
        i,
      );
    }
    expect(readLocalScores().length).toBe(20);
  });
});

describe('flavor firewall (source scan)', () => {
  it('no file in src/net imports core/sim — fetched text cannot reach stepSim', () => {
    const dir = fileURLToPath(new URL('../', import.meta.url)); // src/net
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      expect(src, `${f} must not import core/sim`).not.toMatch(/from\s+['"][^'"]*core\/sim/);
    }
  });
});
