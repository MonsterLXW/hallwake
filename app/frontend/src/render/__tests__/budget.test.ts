// HALLWAKE — budget gate (architecture.md §7). Pure headless arithmetic over
// the real 24-door schedule: every door x both variants x every quality
// preset must fit the mid-iGPU envelope. If a future room/prop change breaks
// the 60fps guarantee structurally, this test fails before a browser ever
// opens.

import { describe, expect, it } from 'vitest';
import { SCHEDULE, doorDef } from '../../core/schedule';
import { BUDGET, ENTITY_DRAW_RESERVE, scenePlanFromRoom, withinBudget } from '../budget';
import { roomPlanFor } from '../roomBuilder';
import { worldItemTriangles } from '../itemMeshes';
import type { Quality } from '../quality';

const QUALITIES: Quality[] = ['low', 'mid', 'high'];

describe('scene budget over the full schedule', () => {
  for (const def of SCHEDULE) {
    for (const variant of ['A', 'B'] as const) {
      for (const quality of QUALITIES) {
        const label = `door ${def.door} (${def.archetype} ${variant}, ${quality})`;
        const plan = scenePlanFromRoom({ ...def, variant }, quality);

        it(`${label}: drawCalls ${plan.drawCalls} <= ${BUDGET.drawCalls}`, () => {
          expect(plan.drawCalls).toBeLessThanOrEqual(BUDGET.drawCalls);
        });
        it(`${label}: dynamicLights ${plan.dynamicLights} <= ${BUDGET.dynamicLights}`, () => {
          expect(plan.dynamicLights).toBeLessThanOrEqual(BUDGET.dynamicLights);
        });
        it(`${label}: shadowMaps === 0`, () => {
          expect(plan.shadowMaps).toBe(0);
        });
        it(`${label}: triangles ${plan.triangles} <= ${BUDGET.triangles}`, () => {
          expect(plan.triangles).toBeLessThanOrEqual(BUDGET.triangles);
        });
        it(`${label}: textureBytes ${(plan.textureBytes / 1024 / 1024).toFixed(2)}MB <= 8MB`, () => {
          expect(plan.textureBytes).toBeLessThanOrEqual(BUDGET.textureBytes);
        });
        it(`${label}: withinBudget() agrees`, () => {
          expect(withinBudget(plan)).toBe(true);
        });
      }
    }
  }
});

describe('per-room structure', () => {
  it('every room merges to <= 7 draws (static+props+door+sconces+alcoves+AO+fake)', () => {
    for (const def of SCHEDULE) {
      for (const variant of ['A', 'B'] as const) {
        const plan = roomPlanFor({ ...def, variant });
        expect(plan.drawCalls).toBeGreaterThanOrEqual(6);
        expect(plan.drawCalls).toBeLessThanOrEqual(7);
      }
    }
  });

  it('two live rooms + entity reserve stay far under the draw-call cap', () => {
    let worst = 0;
    for (const def of SCHEDULE) {
      worst = Math.max(worst, scenePlanFromRoom(def, 'high').drawCalls);
    }
    expect(worst).toBeLessThanOrEqual(2 * 7 + ENTITY_DRAW_RESERVE);
    expect(worst).toBeLessThanOrEqual(BUDGET.drawCalls);
  });

  it('variant B mirrors props but keeps nav points identical', () => {
    const a = roomPlanFor(doorDef(10)); // laundry B in schedule; compare A/B of same archetype
    const b = roomPlanFor({ ...doorDef(10), variant: 'A' });
    expect(a.aoDiscs.length).toBe(b.aoDiscs.length);
    expect(a.sconceQuads.length).toBe(b.sconceQuads.length);
    expect(a.alcoveQuads).toEqual(b.alcoveQuads); // nav points never move
    expect(a.doorQuad).toEqual(b.doorQuad);
  });

  it('loot pile meshes ride their own draw; every room still <= 7', () => {
    // 3D item pass: the loot pile is a real merged silhouette mesh with its
    // own draw (it replaced the stamped crate quad — same slot, same count).
    // Loot doors never carry a closet or fake door (schedule table), so
    // 6 base + 1 pile stays inside the per-room cap.
    let lootPlans = 0;
    for (const def of SCHEDULE) {
      for (const variant of ['A', 'B'] as const) {
        const plan = roomPlanFor({ ...def, variant });
        expect(plan.drawCalls).toBeLessThanOrEqual(7);
        if (def.loot) {
          lootPlans++;
          expect(plan.lootItem).toBe(def.loot);
          expect(plan.drawCalls).toBe(7); // 6 base + the 3D pile mesh
        } else {
          expect(plan.lootItem).toBeNull();
        }
      }
    }
    expect(lootPlans).toBe(16); // doors 2,4,6,8,11,14,17,23 x both variants
  });

  it('the 3D pile mesh replaces the crate-quad draw and budgets its triangles', () => {
    // The mesh must REPLACE the quad's draw, not add one: a loot door with
    // the pile costs exactly one more draw than the same door without loot,
    // and the plan's triangle count carries the real merged-mesh count.
    for (const def of SCHEDULE) {
      if (!def.loot) continue;
      for (const variant of ['A', 'B'] as const) {
        const withPile = roomPlanFor({ ...def, variant });
        const without = roomPlanFor({ ...def, variant, loot: undefined });
        expect(withPile.drawCalls).toBeLessThanOrEqual(7);
        expect(withPile.drawCalls - without.drawCalls).toBe(1);
        expect(withPile.triangles - without.triangles).toBe(worldItemTriangles(def.loot));
      }
    }
  });

  it('door 24 (finale) preloads no next room', () => {
    const last = scenePlanFromRoom(doorDef(24), 'mid');
    const mid = scenePlanFromRoom(doorDef(12), 'mid');
    expect(last.drawCalls).toBeLessThan(mid.drawCalls);
  });
});
