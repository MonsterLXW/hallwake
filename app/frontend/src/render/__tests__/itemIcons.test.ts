// HALLWAKE — item art gate. Every kit item (and the coin) has ONE generated
// pixel-stencil icon: deterministic (identical pixels on repeat generation,
// no Math.random anywhere in textures.ts), cached per kind, one distinct
// texture per kind, and the 3D loot crate marker follows the same rules.
// Headless: the canvas is stubbed with a recording 2D context, so the tests
// compare the actual painted RGBA bytes between two fresh generations.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PaintImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const recorder: { images: PaintImage[] } = { images: [] };

function makeStubCtx(): unknown {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'createImageData') {
          return (w: number, h: number): PaintImage => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          });
        }
        if (prop === 'putImageData') {
          return (img: PaintImage): void => {
            recorder.images.push(img);
          };
        }
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => undefined;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
}

function stubCanvas(): void {
  (globalThis as Record<string, unknown>).document = {
    documentElement: {},
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => makeStubCtx(),
    }),
  };
}

const KINDS = ['PICK', 'TONIC', 'FLASK', 'WARD', 'COIN'] as const;
const LOOT_KINDS = ['PICK', 'TONIC', 'FLASK', 'WARD'] as const;

beforeAll(() => {
  stubCanvas();
  vi.stubGlobal('fetch', () => {
    throw new Error('item icons must never fetch');
  });
});

describe('item icon textures', () => {
  it('one distinct cached texture per kind, 64px, generated not loaded', async () => {
    const tex = await import('../textures');
    for (const k of KINDS) {
      const t = tex.itemIconTexture(k);
      expect((t.image as { width: number }).width).toBe(64);
      expect((t.image as { height: number }).height).toBe(64);
      expect(tex.itemIconTexture(k)).toBe(t); // cached per kind
    }
    for (const k of LOOT_KINDS) {
      const m = tex.getLootMarkerTexture(k);
      expect((m.image as { width: number }).width).toBe(64);
      expect(tex.getLootMarkerTexture(k)).toBe(m);
    }
    // every kind is its own texture — PICK and TONIC can never be confused
    const icons = KINDS.map((k) => tex.itemIconTexture(k));
    expect(new Set(icons).size).toBe(KINDS.length);
    const markers = LOOT_KINDS.map((k) => tex.getLootMarkerTexture(k));
    expect(new Set(markers).size).toBe(LOOT_KINDS.length);
  });

  it('deterministic: identical pixels across two fresh generations', async () => {
    const generate = async (): Promise<number[][]> => {
      vi.resetModules();
      stubCanvas();
      recorder.images.length = 0;
      const tex = await import('../textures');
      for (const k of KINDS) tex.itemIconTexture(k);
      for (const k of LOOT_KINDS) tex.getLootMarkerTexture(k);
      return recorder.images.map((img) => Array.from(img.data));
    };
    const first = await generate();
    const second = await generate();
    expect(first.length).toBe(KINDS.length + LOOT_KINDS.length);
    expect(second.length).toBe(first.length);
    for (let i = 0; i < first.length; i++) {
      expect(second[i]).toEqual(first[i]); // byte-for-byte identical
    }
    // and none of them is blank: every icon paints bone pixels
    for (const bytes of first) {
      expect(bytes.some((v) => v > 0)).toBe(true);
    }
  });

  it('textures.ts contains no Math.random (pixel art is deterministic)', () => {
    const src = readFileSync(join(__dirname, '..', 'textures.ts'), 'utf8');
    // call form (not the prose in the header comment): no RNG anywhere
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });

  it('icon bytes are accounted for in the texture budget', async () => {
    const tex = await import('../textures');
    const withIcons = tex.textureBytesFor('mid', 2);
    expect(withIcons).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
});
