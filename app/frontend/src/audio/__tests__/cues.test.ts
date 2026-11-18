// HALLWAKE — audio cue gate (architecture.md §8). cues.ts must be pure
// serializable data: every SimEvent type has a recipe, every entity tell has
// its own voice, recipes survive a JSON round-trip, and the file references
// no WebAudio API at all. graph.ts is proven headless-safe: importing and
// driving it without an AudioContext must never throw and must never create
// a context eagerly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { EntityKind, EventType, SimEvent } from '../../core/types';
import {
  cueForEvent,
  EVENT_CUES,
  FOOTSTEP_CUE,
  TELL_CUES,
  WHISPER_BED,
  type BusName,
  type CueRecipe,
  type Layer,
  type OscKind,
} from '../cues';
import { createAudioGraph } from '../graph';

const EVENT_TYPES: EventType[] = [
  'tell', 'death', 'door_open', 'banish', 'checkpoint', 'finale',
  'loot', 'coin', 'item_use', 'lock', 'hide',
];
const ENTITY_KINDS: EntityKind[] = ['GAUNT', 'MURMUR', 'TALLY', 'CINDER'];
const BUSES: BusName[] = ['ambience', 'door', 'gaunt', 'murmur', 'tally', 'cinder'];
const OSC_KINDS: OscKind[] = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];

function checkRecipe(label: string, r: CueRecipe): void {
  expect(BUSES, label).toContain(r.bus);
  expect(r.layers.length, label).toBeGreaterThan(0);
  for (const L of r.layers) {
    expect(OSC_KINDS, `${label} osc`).toContain(L.osc);
    expect(L.gain, `${label} gain`).toBeGreaterThan(0);
    expect(L.gain, `${label} gain`).toBeLessThanOrEqual(1);
    expect(L.dur, `${label} dur`).toBeGreaterThan(0);
    expect(L.attack, `${label} attack`).toBeGreaterThanOrEqual(0);
    expect(L.attack, `${label} attack`).toBeLessThan(L.dur);
    expect(Number.isFinite(L.freqFrom) && L.freqFrom >= 0, `${label} freqFrom`).toBe(true);
    expect(Number.isFinite(L.freqTo) && L.freqTo >= 0, `${label} freqTo`).toBe(true);
    if (L.filter) {
      expect(['lowpass', 'highpass', 'bandpass'], `${label} filter`).toContain(L.filter.type);
      expect(L.filter.q, `${label} q`).toBeGreaterThan(0);
    }
    if (L.tremoloHz !== undefined) {
      expect(L.tremoloHz).toBeGreaterThan(0);
      expect(L.tremoloDepth ?? 0).toBeGreaterThanOrEqual(0);
      expect(L.tremoloDepth ?? 0).toBeLessThanOrEqual(1);
    }
  }
}

describe('cue coverage', () => {
  it('every SimEvent type in the core union has a recipe', () => {
    for (const t of EVENT_TYPES) {
      expect(EVENT_CUES[t], `EVENT_CUES.${t}`).toBeDefined();
      checkRecipe(`EVENT_CUES.${t}`, EVENT_CUES[t]);
    }
  });

  it('every entity tell has its own voice', () => {
    for (const k of ENTITY_KINDS) {
      expect(TELL_CUES[k], `TELL_CUES.${k}`).toBeDefined();
      checkRecipe(`TELL_CUES.${k}`, TELL_CUES[k]);
    }
  });

  it('footstep + whisper bed recipes are valid', () => {
    checkRecipe('FOOTSTEP_CUE', FOOTSTEP_CUE);
    expect(BUSES).toContain(WHISPER_BED.bus);
    expect(WHISPER_BED.gain).toBeGreaterThan(0);
    expect(WHISPER_BED.filter.q).toBeGreaterThan(0);
  });

  it('recipes are serializable data (JSON round-trip is lossless)', () => {
    const all = [
      ...Object.values(EVENT_CUES),
      ...Object.values(TELL_CUES),
      FOOTSTEP_CUE,
    ];
    for (const r of all) {
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    }
    expect(JSON.parse(JSON.stringify(WHISPER_BED))).toEqual(WHISPER_BED);
  });

  it('cueForEvent prefers the per-entity tell voice', () => {
    expect(cueForEvent('tell', 'GAUNT')).toBe(TELL_CUES.GAUNT);
    expect(cueForEvent('tell')).toBe(EVENT_CUES.tell);
    expect(cueForEvent('door_open')).toBe(EVENT_CUES.door_open);
    expect(cueForEvent('banish', 'CINDER')).toBe(EVENT_CUES.banish);
  });
});

describe('cues.ts purity (source scan)', () => {
  const src = readFileSync(fileURLToPath(new URL('../cues.ts', import.meta.url)), 'utf8');

  it('references no WebAudio API — recipes are data only', () => {
    for (const banned of ['AudioContext', 'OscillatorNode', 'createGain', 'AudioBuffer', 'BiquadFilter', 'new Audio']) {
      expect(src.includes(banned), `cues.ts must not mention ${banned}`).toBe(false);
    }
  });

  it('imports only core types', () => {
    const imports = src.match(/^import .*$/gm) ?? [];
    for (const line of imports) {
      expect(line).toMatch(/^import type .* from '\.\.\/core\/types';$/);
    }
  });
});

describe('graph.ts headless safety (lazy context)', () => {
  it('importing + driving the graph without WebAudio never throws and never creates a context', () => {
    expect(typeof AudioContext).toBe('undefined'); // node env: no WebAudio at all
    const g = createAudioGraph();
    expect(g.context()).toBeNull();
    expect(g.ensure()).toBe(false);
    const ev: SimEvent = { type: 'tell', entity: 'GAUNT', door: 7, visible: true };
    expect(() => g.playEvent(ev, 0.5)).not.toThrow();
    expect(() => g.setWhisper(0.4)).not.toThrow();
    expect(() => g.footstep(0.8)).not.toThrow();
    expect(() => g.startAmbience()).not.toThrow();
    expect(() => g.setMuted(true)).not.toThrow();
    expect(() => g.dispose()).not.toThrow();
    expect(g.context()).toBeNull();
  });

  it('arm() is a no-op without a window (headless kiosk-safe)', () => {
    const g = createAudioGraph();
    expect(() => g.arm()).not.toThrow();
    expect(g.context()).toBeNull();
  });
});
