// HALLWAKE — the render budget, enforced not aspirational (architecture.md §7).
// scenePlanFromRoom is PURE data arithmetic: it counts what the live scene
// would cost (current room + preloaded next room + the entity draw reserve
// T3's mesh factories inherit) without touching WebGL. vitest asserts the
// caps over all 24 doors x 2 variants, so no archetype/quality combination
// can ever regress past the mid-iGPU 60fps envelope.

import type { DoorDef } from '../core/schedule';
import { doorDef } from '../core/schedule';
import { roomPlanFor } from './roomBuilder';
import { textureBytesFor } from './textures';
import { QUALITY, type Quality } from './quality';

export interface ScenePlan {
  drawCalls: number;
  dynamicLights: number;
  shadowMaps: number;
  triangles: number;
  textureBytes: number;
}

export const BUDGET = {
  drawCalls: 150,
  dynamicLights: 3,
  shadowMaps: 0,
  triangles: 120_000,
  textureBytes: 8 * 1024 * 1024,
} as const;

// T3's entity factories are capped at 12 primitives each (entityMeshes.test);
// the finale runs at most 2 entities. Reserve their worst case here so the
// room builder can never spend the entity allowance.
export const ENTITY_DRAW_RESERVE = 24;
export const ENTITY_TRI_RESERVE = 24 * 256;

export function scenePlanFromRoom(def: DoorDef, quality: Quality = 'mid'): ScenePlan {
  const current = roomPlanFor(def);
  const next = def.door < 24 ? roomPlanFor(doorDef(def.door + 1)) : null;
  const roomsAlive = next ? 2 : 1;

  return {
    drawCalls:
      current.drawCalls + (next ? next.drawCalls : 0) + ENTITY_DRAW_RESERVE,
    dynamicLights: 1 + QUALITY[quality].eventLights, // lantern + event PointLights
    shadowMaps: 0, // no shadow maps anywhere, at any quality (architecture §3)
    triangles:
      current.triangles + (next ? next.triangles : 0) + ENTITY_TRI_RESERVE,
    textureBytes: textureBytesFor(quality, roomsAlive),
  };
}

export function withinBudget(plan: ScenePlan): boolean {
  return (
    plan.drawCalls <= BUDGET.drawCalls &&
    plan.dynamicLights <= BUDGET.dynamicLights &&
    plan.shadowMaps === BUDGET.shadowMaps &&
    plan.triangles <= BUDGET.triangles &&
    plan.textureBytes <= BUDGET.textureBytes
  );
}
