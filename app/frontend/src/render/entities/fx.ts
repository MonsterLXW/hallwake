// HALLWAKE — entity FX hub (architecture.md §3/§5, design-brief §3/§7).
// Owns three things the four entity factories share: (1) runtime identity
// token reads (tokens.css is the single color source — fallbacks mirror it
// verbatim for headless runs), (2) procedural canvas textures for entity
// details (stitch seams, chalk tallies, the hollow face — zero image files),
// and (3) mountEntities(): the single helper that keeps an EntityGroup in
// sync with sim state and dispatches SimEvents to an audio sink.
//
// Fairness contract (brief §7): every tell keeps its steady state under
// reduced motion — amber stays amber, blue stays blue; only the flicker
// collapses. Audio channels are never touched by the visual layer.

import * as THREE from 'three';
import type { EntityKind, SimEvent, SimState } from '../../core/types';
import { doorDef, sconcePositions } from '../../core/schedule';
import type { PaintImage } from '../textures';
import { buildGaunt } from './gaunt';
import { buildMurmur } from './murmur';
import { buildTally } from './tally';
import { buildCinder } from './cinder';

// ---- identity tokens at runtime (mirrors scene.ts / textures.ts pattern) ----

const tokenMemo = new Map<string, number>();

export function tokenColor(name: string, fallback: string): number {
  const memo = tokenMemo.get(name);
  if (memo !== undefined) return memo;
  let value: number;
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      value = v ? parseInt(v.replace('#', ''), 16) : parseInt(fallback.slice(1), 16);
    } catch {
      value = parseInt(fallback.slice(1), 16);
    }
  } else {
    value = parseInt(fallback.slice(1), 16);
  }
  tokenMemo.set(name, value);
  return value;
}

function tokenRgb(name: string, fallback: string): [number, number, number] {
  const n = tokenColor(name, fallback);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const TOKEN = {
  bg: '#0A0A0E',
  bone: '#EDE7DA',
  boneDim: '#BFB8A9',
  boneFaint: '#857E70',
  gaunt: '#F2A63C', // sodium amber — GAUNT owns amber (brief §3)
  tally: '#D6574C', // chalk red — TALLY + oil alarm share it, disambiguated by slot
  cinder: '#58B4E8', // spectral blue — CINDER
  murmur: '#C9C6BE', // hueless by design: MURMUR is luminance, not hue
  warm: '#E3D7BC', // oil-high lantern tone
} as const;

// ---- deterministic pixel noise (integer hash; never Math.random) ----

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// ---- procedural entity textures (cached; stub-friendly like textures.ts) ----

const texCache = new Map<string, THREE.CanvasTexture>();

function paintTexture(key: string, px: number, paint: (img: PaintImage) => void): THREE.CanvasTexture {
  const hit = texCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error('fx: no document/canvas available');
  }
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d') as unknown as {
    createImageData(w: number, h: number): PaintImage;
    putImageData(img: PaintImage, x: number, y: number): void;
  };
  const img = ctx.createImageData(px, px);
  paint(img);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

function setPx(img: PaintImage, x: number, y: number, rgb: [number, number, number], a: number): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0];
  img.data[i + 1] = rgb[1];
  img.data[i + 2] = rgb[2];
  img.data[i + 3] = a;
}

// GAUNT seam: a stitched vertical suture with cross-stitches — the thing
// that holds its too-tall shape together. Bone-grey on transparent.
export function getStitchTexture(): THREE.CanvasTexture {
  const p = tokenRgb('--color-ink-secondary', TOKEN.boneDim);
  return paintTexture('entity@stitch', 128, (img) => {
    for (let y = 0; y < img.height; y++) {
      const wobble = Math.round((hash(0, y, 41) - 0.5) * 3);
      for (let dx = -1; dx <= 1; dx++) setPx(img, 64 + dx + wobble, y, p, 210);
      if (y % 14 < 3) {
        for (let dx = -8; dx <= 8; dx++) setPx(img, 64 + dx + wobble, y, p, 190);
      }
    }
  });
}

// TALLY chalk: four vertical strokes + the fifth diagonal, chalk-red, with
// hand jitter from the hash — marks a porter counted in the dark.
export function getChalkTexture(): THREE.CanvasTexture {
  const p = tokenRgb('--signal-tally', TOKEN.tally);
  return paintTexture('entity@chalk', 128, (img) => {
    const stroke = (x0: number, y0: number, x1: number, y1: number, w: number): void => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        const j = Math.round((hash(x, y, 17) - 0.5) * 2);
        for (let d = -w; d <= w; d++) {
          const a = 235 - Math.abs(d) * 30 - Math.round(hash(x + d, y, 5) * 40);
          setPx(img, x + d + j, y, p, Math.max(0, a));
        }
      }
    };
    stroke(26, 24, 28, 104, 2);
    stroke(46, 22, 48, 102, 2);
    stroke(66, 25, 68, 105, 2);
    stroke(86, 23, 88, 103, 2);
    stroke(16, 98, 100, 26, 2); // the fifth stroke that closes the tally
  });
}

// MURMUR face-in-wall: a hollow ring with slit eyes — deliberately hueless
// (brief §3): its channel is luminance, so the decal is bone-grey only.
export function getFaceTexture(): THREE.CanvasTexture {
  const p = tokenRgb('--signal-murmur', TOKEN.murmur);
  return paintTexture('entity@face', 128, (img) => {
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const cx = x / img.width - 0.5;
        const cy = y / img.height - 0.42;
        const r = Math.hypot(cx, cy);
        const ring = Math.abs(r - 0.34) < 0.028 ? 170 : 0;
        if (ring) setPx(img, x, y, p, ring * (0.7 + 0.3 * hash(x, y, 9)));
      }
    }
    for (let y = 50; y <= 66; y++) {
      for (let x = 42; x <= 52; x++) setPx(img, x, y, p, 225);
      for (let x = 74; x <= 84; x++) setPx(img, x, y, p, 225);
    }
    for (let y = 84; y <= 90; y++) {
      for (let x = 56; x <= 70; x++) setPx(img, x, y, p, 130);
    }
  });
}

// ---- tell envelopes (brief §7: flicker is information, not decoration) ----

// GAUNT tell: two 180 ms blinks, then steady amber for the sweep window.
// Reduced motion: no blinks — the steady amber state is identical, so the
// counterplay window reads the same (fair fallback).
export function flickerEnvelope(nowSec: number, tellStartSec: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const e = nowSec - tellStartSec;
  if (e < 0 || e > 0.36) return 1;
  const blink = Math.floor(e / 0.18);
  return blink % 2 === 0 ? 0.25 : 1;
}

// TALLY: one steady 1 s red beat on the numeral/frame (brief §7).
// Returns 0..1 glow weight; reduced motion keeps the full beat (it is a
// window, not decoration).
export function numeralBeat(nowSec: number, tellStartSec: number): number {
  const e = nowSec - tellStartSec;
  if (e < 0 || e > 1.0) return 0;
  return 1 - e / 1.0;
}

// CINDER blue-flame swap: warm sconce tone -> spectral blue, with a
// deterministic flame flicker on scale. Reduced motion: steady blue.
export function blueFlameSwap(mat: THREE.MeshBasicMaterial, live: boolean, t: number, reducedMotion: boolean): number {
  mat.color.set(live ? tokenColor('--signal-cinder', TOKEN.cinder) : tokenColor('--oil-high', TOKEN.warm));
  if (!live) return 1;
  if (reducedMotion) return 1;
  return 1 + 0.12 * Math.sin(t * 11) + 0.06 * Math.sin(t * 7.3);
}

export interface TellLightState {
  lanternColor: number | null; // null = keep the warm lantern tone
  lanternMul: number; // multiplier on lantern intensity
  eventColor: number | null; // tint for the pooled event PointLights
}

// The amber-flicker helper: derives lantern + event-light state purely from
// sim phases + tell start times, so any host (scene.ts today, integration
// later) drives lights from one source of truth.
export function tellLightState(
  sim: SimState,
  nowSec: number,
  tellStart: Partial<Record<EntityKind, number>>,
  reducedMotion: boolean,
): TellLightState {
  const gaunt = sim.entities.find((e) => e.kind === 'GAUNT');
  const cinder = sim.entities.find((e) => e.kind === 'CINDER');
  const murmur = sim.entities.find((e) => e.kind === 'MURMUR');
  const gauntLive = !!gaunt && (gaunt.phase === 'TELL' || gaunt.phase === 'SWEEP');
  const cinderLive = !!cinder && (cinder.phase === 'TELL' || cinder.phase === 'BLACKOUT');
  const murmurNear = !!murmur && murmur.phase === 'HUNT' && (murmur.dist ?? Infinity) < 5;

  let lanternMul = 1;
  if (gauntLive) lanternMul *= flickerEnvelope(nowSec, tellStart.GAUNT ?? -1, reducedMotion);
  if (murmurNear) lanternMul *= reducedMotion ? 0.8 : 0.82 + 0.18 * Math.sin(nowSec * 23);

  return {
    lanternColor: gauntLive
      ? tokenColor('--signal-gaunt', TOKEN.gaunt)
      : cinderLive
        ? tokenColor('--signal-cinder', TOKEN.cinder)
        : null,
    lanternMul,
    eventColor: cinderLive
      ? tokenColor('--signal-cinder', TOKEN.cinder)
      : gauntLive
        ? tokenColor('--signal-gaunt', TOKEN.gaunt)
        : null,
  };
}

// ---- shared factory contract ----

export interface EntityCtx {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  reducedMotion: boolean;
  door: number;
  // wall-clock second the entity's tell event last fired (from the event
  // channel); factories steady-state when it is absent.
  tellStart?: number;
}

const DEFAULT_CTX: EntityCtx = { playerX: 0, playerZ: 0, playerYaw: 0, reducedMotion: false, door: 1 };

export interface EntityVisual<S> {
  group: THREE.Group;
  primitiveCount: number;
  update(state: S, t: number, ctx?: EntityCtx): void;
  dispose(): void;
}

// Dispose geometries + materials of a visual; textures stay in the shared
// cache (they are reused across rooms and runs).
export function disposeVisual(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
      obj.geometry.dispose();
      const m = obj.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else m.dispose();
    }
  });
  group.clear();
}

// ---- mountEntities: the single integration point (spec: fx.ts subscribes
// to SimEvents through the update channel the loop already carries) ----

export interface AudioSink {
  playEvent(ev: SimEvent, facingDot?: number): void;
  setWhisper(gain: number): void;
}

export interface MountOptions {
  audio?: AudioSink;
  reducedMotion?: boolean; // default: read prefers-reduced-motion
}

export interface EntityHostHandle {
  update(sim: SimState, events: SimEvent[], nowSec: number): void;
  dispose(): void;
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

type AnyVisual = EntityVisual<never>;

export function mountEntities(host: THREE.Object3D, opts: MountOptions = {}): EntityHostHandle {
  const visuals = new Map<EntityKind, AnyVisual>();
  const tellStart: Partial<Record<EntityKind, number>> = {};
  const reduced =
    opts.reducedMotion ??
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clearVisuals(): void {
    for (const v of visuals.values()) {
      v.group.removeFromParent();
      disposeVisual(v.group);
    }
    visuals.clear();
    delete tellStart.GAUNT;
    delete tellStart.TALLY;
    delete tellStart.CINDER;
  }

  function update(sim: SimState, events: SimEvent[], nowSec: number): void {
    // 1) tell start times + audio dispatch (fx.ts owns the event channel)
    let murmurDot = 0;
    const murmur = sim.entities.find((e) => e.kind === 'MURMUR');
    if (murmur) {
      const bearing = Math.atan2(murmur.x - sim.player.x, murmur.z - sim.player.z);
      // the sim seeds dist as NaN until the first step — treat it as far
      const dist = Number.isFinite(murmur.dist) ? (murmur.dist as number) : 10;
      const prox = Math.max(0, Math.min(1, 1 - dist / 10));
      murmurDot = Math.max(0, Math.cos(angleDiff(sim.player.yaw, bearing))) * prox;
    }
    for (const ev of events) {
      if (ev.type === 'tell' && ev.entity && ev.visible && tellStart[ev.entity] === undefined) {
        tellStart[ev.entity] = nowSec;
      }
      if (ev.type === 'door_open' || ev.type === 'death') clearVisuals();
      opts.audio?.playEvent(ev, murmurDot);
    }
    opts.audio?.setWhisper(murmur ? murmurDot : 0);

    // 2) sync one visual per live entity kind
    const present = new Set<EntityKind>();
    const ctx: EntityCtx = {
      playerX: sim.player.x,
      playerZ: sim.player.z,
      playerYaw: sim.player.yaw,
      reducedMotion: reduced,
      door: sim.door,
    };
    for (const e of sim.entities) {
      present.add(e.kind);
      let v = visuals.get(e.kind);
      if (!v) {
        if (e.kind === 'GAUNT') v = buildGaunt() as unknown as AnyVisual;
        else if (e.kind === 'MURMUR') v = buildMurmur() as unknown as AnyVisual;
        else if (e.kind === 'TALLY') {
          const fake = doorDef(sim.door).tallyFakeNum ?? sim.doorLog + 2;
          v = buildTally(fake) as unknown as AnyVisual;
        } else v = buildCinder() as unknown as AnyVisual;
        visuals.set(e.kind, v);
        host.add(v.group);
      }
      ctx.tellStart = tellStart[e.kind];
      v.update(e as never, nowSec, ctx);

      // schedule-keyed anchors: movers carry their own x/z; anchored kinds
      // sit on the door geometry the sim already uses.
      if (e.kind === 'GAUNT' || e.kind === 'MURMUR') {
        v.group.position.set(e.x, 0, e.z);
      } else if (e.kind === 'TALLY') {
        v.group.position.set(7, 0, 9.78); // exit door plane, room-local
      } else if (e.kind === 'CINDER') {
        const sc = sconcePositions(doorDef(sim.door))[1];
        v.group.position.set(sc.x, 0, sc.z);
      }
    }
    for (const [kind, v] of visuals) {
      if (!present.has(kind)) {
        v.group.removeFromParent();
        disposeVisual(v.group);
        visuals.delete(kind);
      }
    }
  }

  return {
    update,
    dispose(): void {
      clearVisuals();
    },
  };
}

export { DEFAULT_CTX };
