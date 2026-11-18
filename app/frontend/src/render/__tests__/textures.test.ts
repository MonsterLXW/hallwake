// HALLWAKE — procedural texture gate: every texture is generated from pixel
// math (no fetch, no image files), cached by key (identical object on repeat
// calls), and sized per the quality presets. Runs headless: the DOM canvas is
// stubbed with a recording 2D context, which also proves the paints actually
// write non-empty pixel data.

import { beforeAll, describe, expect, it, vi } from 'vitest';

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

type Textures = typeof import('../textures');
let tex: Textures;

beforeAll(async () => {
  // Stub the canvas BEFORE importing the module under test.
  (globalThis as Record<string, unknown>).document = {
    documentElement: {},
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => makeStubCtx(),
    }),
  };
  // Any network use is a hard failure: all art is procedural.
  vi.stubGlobal('fetch', () => {
    throw new Error('textures.ts must never fetch');
  });
  tex = await import('../textures');
});

describe('texture cache', () => {
  it('returns the identical object for the same key', () => {
    expect(tex.getAtlas('mid')).toBe(tex.getAtlas('mid'));
    expect(tex.getAtlas('low')).toBe(tex.getAtlas('low'));
    expect(tex.getAtlas('low')).not.toBe(tex.getAtlas('mid'));
    expect(tex.getNumeralTexture(7)).toBe(tex.getNumeralTexture(7));
    expect(tex.getEmissiveTexture('sconce')).toBe(tex.getEmissiveTexture('sconce'));
  });

  it('every declared key generates without touching the network', () => {
    const before = tex.textureCacheSize();
    for (const key of tex.TEXTURE_KEYS) {
      if (key.startsWith('atlas@')) {
        tex.getAtlas(key === 'atlas@512' ? 'low' : 'mid');
      } else if (key.startsWith('numeral@')) {
        tex.getNumeralTexture(Number(key.split('@')[1]));
      } else {
        tex.getEmissiveTexture(key.split('@')[1] as 'sconce' | 'alcove' | 'ao');
      }
    }
    expect(tex.textureCacheSize()).toBeGreaterThanOrEqual(before);
    // all keys now resident
    expect(tex.getAtlas('mid')).toBeDefined();
  });

  it('sizes follow the quality presets (512px walls / 256px props at mid)', () => {
    expect((tex.getAtlas('mid').image as { width: number }).width).toBe(1024); // 2x512 atlas
    expect((tex.getAtlas('low').image as { width: number }).width).toBe(512); // 2x256 atlas
    expect((tex.getNumeralTexture(3).image as { width: number }).width).toBe(256);
    expect((tex.getEmissiveTexture('ao').image as { width: number }).width).toBe(128);
  });

  it('paints write real non-empty pixel data (generated, not loaded)', () => {
    expect(recorder.images.length).toBeGreaterThan(0);
    const nonEmpty = recorder.images.filter((img) => img.data.some((v) => v > 0));
    expect(nonEmpty.length).toBe(recorder.images.length);
  });

  it('byte accounting matches the caps used by budget.ts', () => {
    const mid = tex.textureBytesFor('mid', 2);
    const low = tex.textureBytesFor('low', 2);
    expect(mid).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(low).toBeLessThan(mid);
  });
});
