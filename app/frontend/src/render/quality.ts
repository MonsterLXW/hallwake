// HALLWAKE — quality presets (architecture.md §7). Pure data; consumed by
// textures.ts (atlas size), scene.ts (fog + lantern scale) and budget.ts
// (dynamic light count). low = lantern x0.7 + 256px textures + denser fog;
// mid = default; high = +1 event light for the concurrent finale FX.
// Dynamic-light cap stays <= 3 (1 lantern + eventLights) at every preset.

export type Quality = 'low' | 'mid' | 'high';

export interface QualityPreset {
  lanternScale: number; // multiplies lanternRadius(oil) for the SpotLight distance
  fogDensity: number; // FogExp2 density
  wallPx: number; // wall/atlas quadrant resolution (512 at mid, per §7)
  propPx: number; // prop + emissive texture resolution (256 at mid)
  eventLights: number; // dynamic PointLights beyond the lantern
}

export const QUALITY: Record<Quality, QualityPreset> = {
  low: { lanternScale: 0.85, fogDensity: 0.085, wallPx: 256, propPx: 128, eventLights: 1 },
  mid: { lanternScale: 1.15, fogDensity: 0.055, wallPx: 512, propPx: 256, eventLights: 1 },
  high: { lanternScale: 1.2, fogDensity: 0.05, wallPx: 512, propPx: 256, eventLights: 2 },
};

export function parseQuality(v: string | null | undefined): Quality {
  return v === 'low' || v === 'high' ? v : 'mid';
}
