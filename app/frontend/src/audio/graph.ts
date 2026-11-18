// HALLWAKE — the WebAudio synth graph (architecture.md §8). Zero audio
// files: every voice is an OscillatorNode or a deterministic noise buffer,
// routed through the eight buses (six from §8 + the Wave 2 stare/grip buses)
// to masterGain -> DynamicsCompressor -> destination. The AudioContext is
// created lazily on first user input (kiosk keypress resumes it), and
// importing this module in a headless environment is safe: nothing touches
// WebAudio until ensure() runs.
//
//   masterGain -> DynamicsCompressor -> destination
//    ├─ ambienceBus   brown-noise loop + 55 Hz sine drone (always on, 0.15)
//    ├─ doorBus       thud: noise burst + lowpass sweep (open/slam/steps)
//    ├─ gauntBus      slam cue + amber hum (sawtooth 90 Hz + tremolo)
//    ├─ murmurBus     whisper: filtered noise, gain = facing dot
//    ├─ tallyBus      chalk scratch (bandpass noise), red-glow ping
//    ├─ cinderBus     blue-flame hiss (rising sweep), sconce relight chime
//    ├─ stareBus      Wave 2: cold twin-bell chime + high shimmer
//    └─ gripBus       Wave 2: low groan + knuckle drag (tremolo)

import type { SimEvent } from '../core/types';
import { cueForEvent, FOOTSTEP_CUE, WHISPER_BED, type BusName, type CueRecipe, type Layer } from './cues';

const BUS_GAIN: Record<BusName, number> = {
  ambience: 0.15, // architecture §8: always-on bed
  door: 0.5,
  gaunt: 0.45,
  murmur: 0.4,
  tally: 0.4,
  cinder: 0.4,
  stare: 0.4, // Wave 2: the chime bus
  grip: 0.45, // Wave 2: the drag-thud bus
};

// deterministic white noise (LCG — never Math.random, so a run sounds
// identical every time, like the schedule)
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function fillNoise(data: Float32Array, rand: () => number, brown: boolean): void {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const w = rand() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      data[i] = Math.max(-1, Math.min(1, last * 3.5));
    } else {
      data[i] = w;
    }
  }
}

export interface AudioHandle {
  /** Attach one-shot first-input listeners (kiosk: any key/press arms audio). */
  arm(): void;
  /** Lazily create the context + buses; resumes a suspended context. */
  ensure(): boolean;
  startAmbience(): void;
  stopAmbience(): void;
  playEvent(ev: SimEvent, facingDot?: number): void;
  /** Continuous MURMUR whisper bed; gain = facing dot (deterministic). */
  setWhisper(gain: number): void;
  /** Walking footstep — short thud on the door bus, scaled by intensity. */
  footstep(intensity: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
  context(): AudioContext | null;
}

export function createAudioGraph(): AudioHandle {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  const buses = new Map<BusName, GainNode>();

  let whiteBuf: AudioBuffer | null = null;
  let brownBuf: AudioBuffer | null = null;

  let ambience: { noise: AudioBufferSourceNode; drone: OscillatorNode } | null = null;
  let whisper: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  let armed = false;
  const listeners: Array<[string, EventListener]> = [];

  function ensure(): boolean {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume(); // kiosk input resumes
      return true;
    }
    if (typeof AudioContext === 'undefined') return false;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 6;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.15;
    master.connect(comp);
    comp.connect(ctx.destination);
    for (const name of Object.keys(BUS_GAIN) as BusName[]) {
      const bus = ctx.createGain();
      bus.gain.value = BUS_GAIN[name];
      bus.connect(master);
      buses.set(name, bus);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }

  function noiseBuffer(kind: 'white' | 'brown'): AudioBuffer {
    if (!ctx) throw new Error('audio: context not created');
    if (kind === 'white') {
      if (whiteBuf) return whiteBuf;
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      fillNoise(buf.getChannelData(0), lcg(0x9e3779b9), false);
      whiteBuf = buf;
      return buf;
    }
    if (brownBuf) return brownBuf;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    fillNoise(buf.getChannelData(0), lcg(0x85ebca6b), true);
    brownBuf = buf;
    return buf;
  }

  function playLayer(dest: AudioNode, L: Layer, t0: number, gainScale: number): void {
    if (!ctx) return;
    const g = ctx.createGain();
    const peak = L.gain * gainScale;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.002, L.attack));
    g.gain.linearRampToValueAtTime(0, t0 + L.dur);

    let chain: AudioNode = g;
    if (L.filter) {
      const f = ctx.createBiquadFilter();
      f.type = L.filter.type;
      f.frequency.setValueAtTime(L.filter.from, t0);
      f.frequency.linearRampToValueAtTime(L.filter.to, t0 + L.dur);
      f.Q.value = L.filter.q;
      f.connect(g);
      chain = f;
    }

    let src: AudioScheduledSourceNode;
    if (L.osc === 'noise') {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer('white');
      s.loop = true;
      src = s;
    } else {
      const o = ctx.createOscillator();
      o.type = L.osc;
      o.frequency.setValueAtTime(Math.max(1, L.freqFrom), t0);
      o.frequency.linearRampToValueAtTime(Math.max(1, L.freqTo), t0 + L.dur);
      src = o;
    }
    src.connect(chain);
    g.connect(dest);

    if (L.tremoloHz) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = L.tremoloHz;
      const lg = ctx.createGain();
      lg.gain.value = (L.tremoloDepth ?? 0.5) * peak;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start(t0);
      lfo.stop(t0 + L.dur + 0.05);
    }

    src.start(t0);
    src.stop(t0 + L.dur + 0.02);
    src.onended = () => {
      g.disconnect();
      if (chain !== g) chain.disconnect();
    };
  }

  function playRecipe(recipe: CueRecipe, gainScale = 1): void {
    if (!ctx || !master) return;
    const bus = buses.get(recipe.bus);
    if (!bus) return;
    const t0 = ctx.currentTime;
    for (const L of recipe.layers) playLayer(bus, L, t0, gainScale);
  }

  function playEvent(ev: SimEvent, facingDot?: number): void {
    if (!ensure()) return;
    const recipe = cueForEvent(ev.type, ev.entity);
    // MURMUR's whisper channel is the facing dot itself (architecture §8):
    // face it and it grows; look away and the corridor goes quiet.
    const scale = ev.entity === 'MURMUR' && ev.type === 'tell' ? Math.max(0.15, facingDot ?? 0.5) : 1;
    playRecipe(recipe, scale);
  }

  function startAmbience(): void {
    if (!ensure() || !ctx) return;
    if (ambience) return;
    const bus = buses.get('ambience');
    if (!bus) return;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer('brown');
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const ng = ctx.createGain();
    ng.gain.value = 0.5;
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(bus);
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55; // the corridor's hum (architecture §8)
    const dg = ctx.createGain();
    dg.gain.value = 0.3;
    drone.connect(dg);
    dg.connect(bus);
    noise.start();
    drone.start();
    ambience = { noise, drone };
  }

  function stopAmbience(): void {
    if (!ambience || !ctx) return;
    ambience.noise.stop();
    ambience.drone.stop();
    ambience = null;
  }

  function setWhisper(gain: number): void {
    if (!ensure() || !ctx) return;
    const bus = buses.get(WHISPER_BED.bus);
    if (!bus) return;
    if (!whisper) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer('white');
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = WHISPER_BED.filter.type;
      f.frequency.value = WHISPER_BED.filter.from;
      f.Q.value = WHISPER_BED.filter.q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      src.start();
      whisper = { src, gain: g };
    }
    const target = Math.max(0, Math.min(1, gain)) * WHISPER_BED.gain;
    whisper.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.12);
  }

  function footstep(intensity: number): void {
    if (!ensure()) return;
    playRecipe(FOOTSTEP_CUE, Math.max(0, Math.min(1, intensity)));
  }

  function arm(): void {
    if (armed || typeof window === 'undefined') return;
    armed = true;
    const wake: EventListener = () => {
      if (ensure()) startAmbience();
      for (const [type, fn] of listeners) window.removeEventListener(type, fn);
      listeners.length = 0;
    };
    for (const type of ['keydown', 'pointerdown']) {
      window.addEventListener(type, wake);
      listeners.push([type, wake]);
    }
  }

  function setMuted(m: boolean): void {
    muted = m;
    if (master && ctx) master.gain.linearRampToValueAtTime(m ? 0 : 0.9, ctx.currentTime + 0.1);
  }

  function dispose(): void {
    stopAmbience();
    if (whisper && ctx) {
      whisper.src.stop();
      whisper = null;
    }
    for (const [type, fn] of listeners) {
      if (typeof window !== 'undefined') window.removeEventListener(type, fn);
    }
    listeners.length = 0;
    if (ctx) void ctx.close();
    ctx = null;
    master = null;
    buses.clear();
  }

  return {
    arm,
    ensure,
    startAmbience,
    stopAmbience,
    playEvent,
    setWhisper,
    footstep,
    setMuted,
    dispose,
    context: () => ctx,
  };
}
