// HALLWAKE — procedural canvas textures (architecture.md §7, design-brief §8).
// Everything is generated at load from deterministic pixel math: zero image
// files, zero fetches, zero Math.random. The world atlas packs four quadrants
// (plaster / wood / lightmap / noise) so walls+floor+ceiling merge into ONE
// draw call. Palette is read from the identity tokens at runtime (tokens.css
// is the single source); the fallbacks below mirror token values verbatim for
// headless generation.

import * as THREE from 'three';
import { QUALITY, type Quality } from './quality';

// ---- minimal 2D context surface we rely on (tests stub exactly this) ----
export interface PaintImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
export interface PaintCtx {
  createImageData(w: number, h: number): PaintImage;
  putImageData(img: PaintImage, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  fillStyle: string;
  font: string;
  textAlign: string;
  textBaseline: string;
}

type RGB = [number, number, number];

// ---- palette: tokens are the source; fallbacks mirror tokens.css exactly ----
function hexToRgb(hex: string): RGB {
  const h = hex.trim();
  const n = parseInt(h.startsWith('#') ? h.slice(1) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tokenColor(name: string, fallback: string): RGB {
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return hexToRgb(v);
    } catch {
      /* headless or odd document — fall through to the mirrored value */
    }
  }
  return hexToRgb(fallback);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

interface Palette {
  bg: RGB;
  bone: RGB;
  boneDim: RGB;
  boneFaint: RGB;
  plaster: RGB;
  wood: RGB;
  warm: RGB;
}

let palette: Palette | null = null;
function getPalette(): Palette {
  if (palette) return palette;
  const bg = tokenColor('--color-bg', '#0A0A0E');
  const bone = tokenColor('--color-ink', '#EDE7DA');
  const boneDim = tokenColor('--color-ink-secondary', '#BFB8A9');
  const boneFaint = tokenColor('--color-ink-muted', '#857E70');
  palette = {
    bg,
    bone,
    boneDim,
    boneFaint,
    plaster: mix(bg, boneFaint, 0.34), // lantern-lit plaster reads dim bone-grey
    wood: mix(bg, boneDim, 0.22),
    warm: mix(bone, [255, 214, 150], 0.25),
  };
  return palette;
}

// ---- deterministic value noise (integer hash; never Math.random) ----
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// ---- canvas factory (stubbed in headless tests) ----
function createCanvas(px: number): { getContext(kind: '2d'): PaintCtx } {
  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error('textures: no document/canvas available');
  }
  const c = document.createElement('canvas') as HTMLCanvasElement;
  c.width = px;
  c.height = px;
  return c as unknown as { getContext(kind: '2d'): PaintCtx };
}

// ---- quadrant paints -----------------------------------------------------
// lightmap gradient: bright band at lantern height, baked into walls too.
function lightGradient(v: number): number {
  const d = v - 0.55;
  return 0.28 + 0.72 * Math.exp(-(d * d) / 0.05);
}

function paintPlaster(ctx: PaintCtx, px: number, ox: number, oy: number): void {
  const p = getPalette();
  const img = ctx.createImageData(px, px);
  for (let y = 0; y < px; y++) {
    const g = lightGradient(y / px);
    for (let x = 0; x < px; x++) {
      const grain = 0.82 + 0.18 * hash(x, y, 11);
      const patch = 0.8 + 0.2 * hash(x >> 5, y >> 5, 7);
      const v = grain * patch * g;
      const i = (y * px + x) * 4;
      img.data[i] = p.plaster[0] * v;
      img.data[i + 1] = p.plaster[1] * v;
      img.data[i + 2] = p.plaster[2] * v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, ox, oy);
}

function paintWood(ctx: PaintCtx, px: number, ox: number, oy: number): void {
  const p = getPalette();
  const img = ctx.createImageData(px, px);
  const plankW = Math.max(8, px >> 3);
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const plank = (x / plankW) | 0;
      const streak = 0.72 + 0.28 * hash(plank, y >> 3, 5);
      const grain = 0.86 + 0.14 * hash(x, y >> 1, 3);
      const seam = x % plankW === 0 ? 0.55 : 1;
      const g = lightGradient(y / px) * 0.85;
      const v = streak * grain * seam * g;
      const i = (y * px + x) * 4;
      img.data[i] = p.wood[0] * v;
      img.data[i + 1] = p.wood[1] * v * 0.96;
      img.data[i + 2] = p.wood[2] * v * 0.9;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, ox, oy);
}

function paintLightmap(ctx: PaintCtx, px: number, ox: number, oy: number): void {
  const p = getPalette();
  const img = ctx.createImageData(px, px);
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const cx = x / px - 0.5;
      const cy = y / px - 0.5;
      const v = 0.06 + 0.5 * Math.exp(-(cx * cx + cy * cy) / 0.045);
      const i = (y * px + x) * 4;
      img.data[i] = p.boneDim[0] * v;
      img.data[i + 1] = p.boneDim[1] * v;
      img.data[i + 2] = p.boneDim[2] * v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, ox, oy);
}

function paintNoise(ctx: PaintCtx, px: number, ox: number, oy: number): void {
  const img = ctx.createImageData(px, px);
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const v = 0.55 + 0.45 * hash(x, y, 23);
      const i = (y * px + x) * 4;
      const c = v * 255;
      img.data[i] = c;
      img.data[i + 1] = c;
      img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, ox, oy);
}

// ---- public texture API (cached by key; identical object per key) --------
export const ATLAS_CELLS = { plaster: 0, wood: 1, lightmap: 2, noise: 3 } as const;
export type AtlasCell = (typeof ATLAS_CELLS)[keyof typeof ATLAS_CELLS];

const cache = new Map<string, THREE.Texture>();

export function getAtlas(quality: Quality): THREE.Texture {
  const cell = QUALITY[quality].wallPx;
  const px = cell * 2;
  const key = `atlas@${px}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = createCanvas(px);
  const ctx = canvas.getContext('2d');
  paintPlaster(ctx, cell, 0, 0);
  paintWood(ctx, cell, cell, 0);
  paintLightmap(ctx, cell, 0, cell);
  paintNoise(ctx, cell, cell, cell);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

// UV rect for an atlas quadrant, inset half a texel to stop bleed.
export function atlasCellUV(cell: AtlasCell, quality: Quality): { u0: number; v0: number; u1: number; v1: number } {
  const px = QUALITY[quality].wallPx * 2;
  const inset = 0.5 / px;
  const cu = cell % 2;
  const cv = cell >> 1;
  return {
    u0: cu * 0.5 + inset,
    v0: 1 - (cv + 1) * 0.5 + inset,
    u1: (cu + 1) * 0.5 - inset,
    v1: 1 - cv * 0.5 - inset,
  };
}

const NUMERAL_PX = 256;

// Stenciled door numeral — painted-door presence (brief §4 signage voice).
export function getNumeralTexture(n: number): THREE.Texture {
  const key = `numeral@${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = getPalette();
  const canvas = createCanvas(NUMERAL_PX);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${p.bg[0] | 0},${p.bg[1] | 0},${p.bg[2] | 0})`;
  ctx.fillRect(0, 0, NUMERAL_PX, NUMERAL_PX);
  // hairline frame rule (print/ledger register marks)
  ctx.fillStyle = `rgb(${p.boneFaint[0] | 0},${p.boneFaint[1] | 0},${p.boneFaint[2] | 0})`;
  ctx.fillRect(18, 20, NUMERAL_PX - 36, 3);
  ctx.fillRect(18, NUMERAL_PX - 24, NUMERAL_PX - 36, 3);
  ctx.fillStyle = `rgb(${p.bone[0] | 0},${p.bone[1] | 0},${p.bone[2] | 0})`;
  ctx.font = `900 ${NUMERAL_PX * 0.62}px "Big Shoulders Display", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), NUMERAL_PX / 2, NUMERAL_PX * 0.52);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

export type EmissiveKind = 'sconce' | 'alcove' | 'ao';
const EMISSIVE_PX = 128;

export function getEmissiveTexture(kind: EmissiveKind): THREE.Texture {
  const key = `emissive@${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = getPalette();
  const canvas = createCanvas(EMISSIVE_PX);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(EMISSIVE_PX, EMISSIVE_PX);
  for (let y = 0; y < EMISSIVE_PX; y++) {
    for (let x = 0; x < EMISSIVE_PX; x++) {
      const cx = x / EMISSIVE_PX - 0.5;
      const cy = y / EMISSIVE_PX - 0.5;
      const r2 = cx * cx + cy * cy;
      const i = (y * EMISSIVE_PX + x) * 4;
      if (kind === 'sconce') {
        const v = Math.exp(-r2 / 0.05) * (0.85 + 0.15 * hash(x, y, 3));
        img.data[i] = p.warm[0] * v;
        img.data[i + 1] = p.warm[1] * v;
        img.data[i + 2] = p.warm[2] * v;
        img.data[i + 3] = 255;
      } else if (kind === 'alcove') {
        // pale-paint nook: vertical brush streaks, brighter up top
        const streak = 0.7 + 0.3 * hash(x >> 2, 0, 9);
        const v = streak * (0.5 + 0.5 * (1 - y / EMISSIVE_PX));
        img.data[i] = p.boneDim[0] * v;
        img.data[i + 1] = p.boneDim[1] * v;
        img.data[i + 2] = p.boneDim[2] * v;
        img.data[i + 3] = 255;
      } else {
        // blob AO disc: black with radial alpha falloff
        const a = Math.max(0, 1 - r2 / 0.25);
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = (a * a * 230) | 0;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

// ---- byte accounting for budget.ts (pure, no WebGL) ----------------------
export function textureBytesFor(quality: Quality, roomsAlive: number): number {
  const q = QUALITY[quality];
  const atlas = (q.wallPx * 2) ** 2 * 4;
  const emissive = 3 * EMISSIVE_PX * EMISSIVE_PX * 4;
  const numerals = roomsAlive * NUMERAL_PX * NUMERAL_PX * 4;
  return atlas + emissive + numerals;
}

// Keys the test suite walks to prove "every texture is generated, no fetch".
export const TEXTURE_KEYS = [
  'atlas@512',
  'atlas@1024',
  'numeral@1',
  'numeral@24',
  'emissive@sconce',
  'emissive@alcove',
  'emissive@ao',
] as const;

export function textureCacheSize(): number {
  return cache.size;
}
