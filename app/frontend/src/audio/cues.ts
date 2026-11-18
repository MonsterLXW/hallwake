// HALLWAKE — synth recipes as PURE serializable data (architecture.md §8).
// This file must never import or reference WebAudio: graph.ts interprets
// these recipes. vitest asserts every SimEvent type has a cue, every entity
// tell has its own voice, and every recipe survives a JSON round-trip —
// which is what keeps the audio layer replaceable and testable headless.
//
// Bus names mirror the architecture graph, extended by the Wave 2 roster:
//   ambience | door | gaunt | murmur | tally | cinder | stare | grip -> masterGain
// Gains are staged low (bus gain x layer gain stays well under 1.0) so the
// master compressor is a safety net, not a mixer crutch.

import type { EntityKind, EventType } from '../core/types';

export type BusName = 'ambience' | 'door' | 'gaunt' | 'murmur' | 'tally' | 'cinder' | 'stare' | 'grip';

export type OscKind = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface FilterSpec {
  type: 'lowpass' | 'highpass' | 'bandpass';
  from: number; // Hz at cue start
  to: number; // Hz swept to at cue end
  q: number;
}

export interface Layer {
  osc: OscKind; // 'noise' = deterministic white-noise buffer source
  freqFrom: number; // Hz (ignored for noise)
  freqTo: number;
  dur: number; // seconds, envelope total
  attack: number; // seconds to peak gain
  gain: number; // peak gain 0..1
  filter?: FilterSpec;
  tremoloHz?: number; // LFO on the gain (gaunt hum)
  tremoloDepth?: number; // 0..1
}

export interface CueRecipe {
  bus: BusName;
  layers: Layer[];
}

// Continuous MURMUR whisper bed: gain is set live from the facing dot
// (deterministic, architecture §8) — the recipe fixes its voice.
export const WHISPER_BED: { bus: BusName; gain: number; filter: FilterSpec } = {
  bus: 'murmur',
  gain: 0.5,
  filter: { type: 'bandpass', from: 900, to: 1500, q: 3.5 },
};

// Footsteps ride the door bus (both are physical thuds — the bus set stays
// exactly the architecture §8 six).
export const FOOTSTEP_CUE: CueRecipe = {
  bus: 'door',
  layers: [
    { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.09, attack: 0.004, gain: 0.16, filter: { type: 'lowpass', from: 420, to: 180, q: 0.7 } },
  ],
};

// Generic per-event-type cues. 'tell' is the fallback voice; per-entity
// tell voices live in TELL_CUES and take precedence.
export const EVENT_CUES: Record<EventType, CueRecipe> = {
  tell: {
    bus: 'ambience',
    layers: [
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.25, attack: 0.02, gain: 0.12, filter: { type: 'bandpass', from: 600, to: 300, q: 2 } },
    ],
  },
  death: {
    bus: 'door',
    layers: [
      { osc: 'sawtooth', freqFrom: 110, freqTo: 38, dur: 1.1, attack: 0.01, gain: 0.3, filter: { type: 'lowpass', from: 900, to: 160, q: 1.2 } },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.5, attack: 0.005, gain: 0.35, filter: { type: 'lowpass', from: 1200, to: 200, q: 0.8 } },
    ],
  },
  door_open: {
    bus: 'door',
    layers: [
      // thud: noise burst + lowpass sweep down (architecture §8)
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.35, attack: 0.006, gain: 0.4, filter: { type: 'lowpass', from: 1400, to: 140, q: 0.9 } },
      { osc: 'sine', freqFrom: 90, freqTo: 55, dur: 0.4, attack: 0.01, gain: 0.25 },
    ],
  },
  checkpoint: {
    bus: 'door',
    layers: [
      { osc: 'sine', freqFrom: 220, freqTo: 220, dur: 0.16, attack: 0.01, gain: 0.16 },
      { osc: 'sine', freqFrom: 330, freqTo: 330, dur: 0.22, attack: 0.01, gain: 0.14 },
    ],
  },
  banish: {
    bus: 'cinder',
    layers: [
      // relight chime: two clear sines, the corridor exhaling
      { osc: 'sine', freqFrom: 523, freqTo: 523, dur: 0.5, attack: 0.01, gain: 0.22 },
      { osc: 'sine', freqFrom: 784, freqTo: 784, dur: 0.65, attack: 0.02, gain: 0.18 },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.3, attack: 0.01, gain: 0.08, filter: { type: 'highpass', from: 2400, to: 4200, q: 1 } },
    ],
  },
  finale: {
    bus: 'door',
    layers: [
      { osc: 'sine', freqFrom: 392, freqTo: 392, dur: 0.6, attack: 0.02, gain: 0.2 },
      { osc: 'sine', freqFrom: 523, freqTo: 523, dur: 0.8, attack: 0.03, gain: 0.18 },
      { osc: 'sine', freqFrom: 659, freqTo: 659, dur: 1.0, attack: 0.05, gain: 0.16 },
    ],
  },
  // --- Wave 1 kit/loot events (features.md) ---
  loot: {
    bus: 'door',
    layers: [
      // kit into the satchel: short leather-and-clasp thud
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.12, attack: 0.004, gain: 0.2, filter: { type: 'lowpass', from: 900, to: 300, q: 1 } },
      { osc: 'sine', freqFrom: 196, freqTo: 147, dur: 0.18, attack: 0.01, gain: 0.14 },
    ],
  },
  coin: {
    bus: 'door',
    layers: [
      // two bright metal ticks, the purse sound
      { osc: 'sine', freqFrom: 1319, freqTo: 1319, dur: 0.09, attack: 0.003, gain: 0.16 },
      { osc: 'sine', freqFrom: 1760, freqTo: 1760, dur: 0.12, attack: 0.004, gain: 0.12 },
    ],
  },
  item_use: {
    bus: 'ambience',
    layers: [
      // the kit doing its work: a soft drawn breath
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.4, attack: 0.08, gain: 0.14, filter: { type: 'bandpass', from: 400, to: 900, q: 1.5 } },
    ],
  },
  lock: {
    bus: 'door',
    layers: [
      // the PICK turning: a metallic clack then the tumbler giving
      { osc: 'square', freqFrom: 220, freqTo: 180, dur: 0.08, attack: 0.002, gain: 0.16, filter: { type: 'lowpass', from: 2400, to: 900, q: 1 } },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.25, attack: 0.01, gain: 0.22, filter: { type: 'lowpass', from: 1200, to: 200, q: 1 } },
    ],
  },
  hide: {
    bus: 'ambience',
    layers: [
      // the closet panel swinging shut / open: cloth-and-wood
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.3, attack: 0.02, gain: 0.16, filter: { type: 'lowpass', from: 700, to: 250, q: 1.2 } },
    ],
  },
};

// Per-entity tell voices — each tell is learnable by ear (brief §7: audio
// cues are untouched in every motion mode).
export const TELL_CUES: Record<EntityKind, CueRecipe> = {
  GAUNT: {
    bus: 'gaunt',
    layers: [
      // door-slam cue
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.4, attack: 0.005, gain: 0.4, filter: { type: 'lowpass', from: 1500, to: 150, q: 0.9 } },
      // amber hum: sawtooth 90 Hz with tremolo (architecture §8)
      { osc: 'sawtooth', freqFrom: 90, freqTo: 90, dur: 1.6, attack: 0.15, gain: 0.14, filter: { type: 'lowpass', from: 500, to: 300, q: 1 }, tremoloHz: 5.5, tremoloDepth: 0.5 },
    ],
  },
  MURMUR: {
    bus: 'murmur',
    layers: [
      // whisper: filtered noise burst; graph scales gain by facing dot
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.9, attack: 0.25, gain: 0.3, filter: { type: 'bandpass', from: 700, to: 1800, q: 4 } },
    ],
  },
  TALLY: {
    bus: 'tally',
    layers: [
      // chalk scratch: short bandpass noise
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.18, attack: 0.008, gain: 0.3, filter: { type: 'bandpass', from: 2600, to: 1400, q: 6 } },
      // red-glow ping
      { osc: 'sine', freqFrom: 880, freqTo: 880, dur: 0.5, attack: 0.01, gain: 0.14 },
    ],
  },
  CINDER: {
    bus: 'cinder',
    layers: [
      // rising hiss: sawtooth sweep up + noise bed
      { osc: 'sawtooth', freqFrom: 120, freqTo: 420, dur: 1.4, attack: 0.4, gain: 0.12, filter: { type: 'highpass', from: 300, to: 800, q: 0.8 } },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 1.4, attack: 0.5, gain: 0.16, filter: { type: 'highpass', from: 1800, to: 3600, q: 1.2 } },
    ],
  },
  // --- Wave 2 tell voices (features.md) ---
  STARE: {
    bus: 'stare',
    layers: [
      // the chime: two cold bells a third apart + a high shimmer — nothing
      // else in the corridor rings like this, so it is learnable by ear
      { osc: 'sine', freqFrom: 1046, freqTo: 1046, dur: 0.9, attack: 0.01, gain: 0.2 },
      { osc: 'sine', freqFrom: 1318, freqTo: 1318, dur: 1.1, attack: 0.06, gain: 0.14 },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.7, attack: 0.15, gain: 0.07, filter: { type: 'highpass', from: 3200, to: 5200, q: 1.4 } },
    ],
  },
  GRIP: {
    bus: 'grip',
    layers: [
      // the drag-thud: a low groan plus knuckles on plaster — heavy, slow,
      // unmistakably a thing that is coming down the corridor after you
      { osc: 'sawtooth', freqFrom: 70, freqTo: 46, dur: 1.2, attack: 0.05, gain: 0.26, filter: { type: 'lowpass', from: 320, to: 120, q: 1.1 }, tremoloHz: 2.6, tremoloDepth: 0.4 },
      { osc: 'noise', freqFrom: 0, freqTo: 0, dur: 0.8, attack: 0.02, gain: 0.22, filter: { type: 'lowpass', from: 900, to: 240, q: 0.9 } },
    ],
  },
};

export function cueForEvent(type: EventType, entity?: EntityKind): CueRecipe {
  if (type === 'tell' && entity) return TELL_CUES[entity];
  return EVENT_CUES[type];
}
