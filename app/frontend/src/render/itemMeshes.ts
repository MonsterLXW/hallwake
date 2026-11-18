// HALLWAKE — 3D world item silhouettes (3D item pass). The loot pile in the
// world is a real chunky mesh, not a stamped quad: the silhouette reads from
// any angle at booth distance. Each kind is authored from a handful of
// primitives merged into ONE BufferGeometry (mergeGeometries) so a pile costs
// exactly one draw call — the per-room budget invariant (roomBuilder.ts /
// budget.ts) is untouched: the mesh replaces the old crate-quad draw.
//
// Colors are vertex-baked from identity tokens only: bone (--color-ink) for
// the kit items, warm oil-amber (--oil-high) for the coin. Items never wear
// a signal hue (brief §3: color is danger, bone is information). Geometry is
// pure authored arithmetic — no Math.random, so two builds are byte-identical
// and the scene's idle spin/bob is time-based, never RNG.
//
// Every geometry is built centred on the origin in x/z with its base at y=0,
// so the scene can spin it about its own centre and hover-bob it from the
// floor without orbiting the room.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ItemIconKind } from './textures';

export const WORLD_ITEM_KINDS: readonly ItemIconKind[] = ['PICK', 'TONIC', 'FLASK', 'WARD', 'COIN'];

// ---- token colors (same pattern as scene.ts / textures.ts: tokens are the
// source, the fallback mirrors tokens.css verbatim for headless builds) ----
function tokenColor(name: string, fallback: string): THREE.Color {
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return new THREE.Color(parseInt(v.replace('#', ''), 16));
    } catch {
      /* headless or odd document — fall through to the mirrored value */
    }
  }
  return new THREE.Color(fallback);
}

const itemColor = (kind: ItemIconKind): THREE.Color =>
  kind === 'COIN' ? tokenColor('--oil-high', '#E3D7BC') : tokenColor('--color-ink', '#EDE7DA');

// ---- primitive helpers (positioned, indexed, un-merged) -------------------
const box = (w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};
const cyl = (rTop: number, rBottom: number, h: number, seg: number, x: number, y: number, z: number): THREE.BufferGeometry => {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return g;
};

// ---- per-kind silhouettes (chunky: readable at booth distance) ------------
// PICK: skeleton key stood upright — square ring bow on top, straight shaft,
// two cut teeth at the base. All boxes, exactly like the HUD stencil.
const pickParts = (): THREE.BufferGeometry[] => [
  box(0.18, 0.04, 0.04, 0, 0.37, 0), // bow: top bar
  box(0.18, 0.04, 0.04, 0, 0.23, 0), // bow: bottom bar
  box(0.04, 0.10, 0.04, -0.07, 0.30, 0), // bow: left bar
  box(0.04, 0.10, 0.04, 0.07, 0.30, 0), // bow: right bar
  box(0.05, 0.22, 0.05, 0, 0.11, 0), // shaft
  box(0.05, 0.04, 0.05, 0.05, 0.04, 0), // tooth 1
  box(0.05, 0.04, 0.05, 0.05, 0.10, 0), // tooth 2
];

// TONIC: medicine bottle — squat cylinder body, narrow neck, cap block
// (the stencil's cap + neck + body, extruded).
const tonicParts = (): THREE.BufferGeometry[] => [
  cyl(0.085, 0.095, 0.24, 8, 0, 0.12, 0), // body
  cyl(0.04, 0.05, 0.10, 8, 0, 0.29, 0), // neck
  box(0.09, 0.04, 0.09, 0, 0.36, 0), // cap
];

// FLASK: round-bottom bulb + short neck + cork stub.
const flaskParts = (): THREE.BufferGeometry[] => [
  new THREE.SphereGeometry(0.115, 10, 7).translate(0, 0.115, 0), // bulb
  cyl(0.035, 0.045, 0.09, 8, 0, 0.245, 0), // neck
  cyl(0.05, 0.04, 0.05, 8, 0, 0.315, 0), // cork stub
];

// WARD: flat etched charm plate — plaque with a rune (staff + cross bar +
// base bar) proud of the face, deliberately eyeless like the stencil.
const wardParts = (): THREE.BufferGeometry[] => [
  box(0.20, 0.28, 0.035, 0, 0.14, 0), // plaque
  box(0.035, 0.16, 0.02, 0, 0.15, 0.0275), // rune staff
  box(0.10, 0.035, 0.02, 0, 0.19, 0.0275), // rune cross bar
  box(0.09, 0.035, 0.02, 0, 0.08, 0.0275), // rune base bar
];

// COIN: porter's coin — one short, wide disc.
const coinParts = (): THREE.BufferGeometry[] => [
  cyl(0.095, 0.095, 0.035, 12, 0, 0.0175, 0),
];

const PARTS: Record<ItemIconKind, () => THREE.BufferGeometry[]> = {
  PICK: pickParts,
  TONIC: tonicParts,
  FLASK: flaskParts,
  WARD: wardParts,
  COIN: coinParts,
};

// Bake the token color into per-vertex colors so one shared material
// (pileMat, vertexColors) serves every pile and every kind.
function paint(geo: THREE.BufferGeometry, color: THREE.Color): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// The one public contract: a SINGLE merged BufferGeometry per kind — one
// geometry, one mesh, one draw call. Base at y=0, centred on the origin.
export function worldItemGeometry(kind: ItemIconKind): THREE.BufferGeometry {
  const parts = PARTS[kind]();
  const color = itemColor(kind);
  for (const p of parts) paint(p, color);
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error(`worldItemGeometry: merge failed for ${kind}`);
  merged.computeBoundingBox();
  return merged;
}

// Pure triangle count for budget.ts arithmetic — builds once per kind,
// counts, disposes; never leaks a geometry into the live scene.
const triCache = new Map<ItemIconKind, number>();
export function worldItemTriangles(kind: ItemIconKind): number {
  const hit = triCache.get(kind);
  if (hit !== undefined) return hit;
  const g = worldItemGeometry(kind);
  const tris = (g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0)) / 3;
  g.dispose();
  triCache.set(kind, tris);
  return tris;
}
