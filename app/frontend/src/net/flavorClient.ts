// HALLWAKE — flavor client (architecture.md §10/§11). POST /api/flavor with
// an 800 ms AbortController; on ANY failure (timeout, offline, 5xx, empty,
// garbage) fall back to the local canned pool. Flavor text is display-only:
// it is sanitized here and rendered via textContent in the UI — it never
// reaches stepSim, never touches innerHTML, never influences the game.
// This module must never import core/sim (enforced by clients.test).

import { pickLine, type FlavorKind } from './canned';

export type { FlavorKind };

export interface FlavorRequest {
  kind: FlavorKind;
  door: number;
  entity?: string;
  deaths?: number;
}

export interface FlavorResult {
  text: string;
  source: 'llm' | 'canned' | 'local'; // local = client canned fallback
}

export const FLAVOR_TIMEOUT_MS = 800;

// Mirror of the server sanitizer (routers/flavor.py): strip HTML tags and
// control characters, collapse to one line, truncate to 240 chars.
export function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export async function fetchFlavor(req: FlavorRequest): Promise<FlavorResult> {
  const fallback = (): FlavorResult => ({
    text: pickLine(req.kind, req.door),
    source: 'local',
  });
  if (typeof fetch !== 'function') return fallback();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FLAVOR_TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = { kind: req.kind, door: req.door };
    if (req.entity) body.entity = req.entity;
    if (typeof req.deaths === 'number') body.deaths = req.deaths;
    const res = await fetch('/api/flavor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return fallback();
    const data = (await res.json()) as { source?: unknown; text?: unknown };
    const text = typeof data.text === 'string' ? sanitizeText(data.text) : '';
    if (!text) return fallback();
    return { text, source: data.source === 'llm' ? 'llm' : 'canned' };
  } catch {
    return fallback(); // abort, network down, bad JSON — all canned
  } finally {
    clearTimeout(timer);
  }
}
