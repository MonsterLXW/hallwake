// HALLWAKE — canned pools are first-class content (architecture.md §11):
// >=30 hand-authored lines per kind, deterministic (kind, door) % len pick,
// single-line <=240 chars, and clean under the ip-check banned-term sets.

import { describe, expect, it } from 'vitest';
import { CANNED, KINDS, kindSeed, pickIndex, pickLine, type FlavorKind } from '../../net/canned';

// Split so this guard file never trips scripts/ip-check.sh itself.
const BANNED_CI = ['rob' + 'lox', 'ls' + 'plash', 'ro' + 'coco', 'scre' + 'ech', 'st' + 'onk', 'am' + 'ity', 'du' + 'pe'];
const BANNED_CS = ['D' + 'OORS', 'Ru' + 'sh', 'Fig' + 'ure', 'Ha' + 'lt', 'Gli' + 'tch', 'Je' + 'ff', 'Ey' + 'es', 'Bli' + 'nk'];

function hasBanned(text: string): string | null {
  for (const w of BANNED_CI) if (new RegExp(`\\b${w}\\b`, 'i').test(text)) return w;
  for (const w of BANNED_CS) if (new RegExp(`\\b${w}\\b`).test(text)) return w;
  return null;
}

describe('canned flavor pools', () => {
  it('has >= 30 lines for every kind', () => {
    for (const kind of KINDS) {
      expect(CANNED[kind].length, `kind ${kind}`).toBeGreaterThanOrEqual(30);
    }
  });

  it('every line is trimmed, single-line, non-empty and <= 240 chars', () => {
    for (const kind of KINDS) {
      for (const line of CANNED[kind]) {
        expect(line.length).toBeGreaterThan(0);
        expect(line).toBe(line.trim());
        expect(line).not.toMatch(/[\r\n]/);
        expect(line.length).toBeLessThanOrEqual(240);
      }
    }
  });

  it('carries no banned IP terms (mirrors scripts/ip-check.sh sets)', () => {
    for (const kind of KINDS) {
      for (const line of CANNED[kind]) {
        expect(hasBanned(line), `banned term in: ${line}`).toBeNull();
      }
    }
  });

  it('pick is deterministic and follows (kind, door) % len', () => {
    for (const kind of KINDS) {
      const len = CANNED[kind].length;
      for (let door = 1; door <= 24; door++) {
        expect(pickLine(kind, door)).toBe(pickLine(kind, door));
        expect(pickIndex(kind, door)).toBe(((kindSeed(kind) + door) % len + len) % len);
      }
    }
  });

  it('doors 1..24 get distinct lines within a kind', () => {
    for (const kind of KINDS) {
      const seen = new Set<string>();
      for (let door = 1; door <= 24; door++) seen.add(pickLine(kind, door));
      expect(seen.size).toBe(24);
    }
  });

  it('kind list is exactly lore/epitaph/run', () => {
    const kinds: FlavorKind[] = ['lore', 'epitaph', 'run'];
    expect([...KINDS].sort()).toEqual([...kinds].sort());
  });
});
