// HALLWAKE — Wave 4 minimap: the pure selector behind the HUD's top-down
// room plate (features.md). minimapData(sim) derives everything from SimState
// + the fixed schedule geometry — no RNG, no new state, no renderer input.
// The SVG component (ui/Minimap.tsx) only draws what this returns; the data
// is unit-testable headless.

import type { AABB } from './schedule';
import { EXIT_DOOR, FAKE_DOOR_POS, archetypeGeom, doorDef } from './schedule';
import type { EntityKind, SimState } from './types';

export interface MinimapBlip {
  x: number;
  z: number;
  kind: EntityKind;
}

export interface MinimapData {
  door: number;
  colliders: AABB[]; // the room's prop walls
  exit: { x: number; z: number };
  locked: boolean; // exit is locked and the kit has no PICK
  closet: AABB | null; // enterable hide rect, if this room has one
  loot: { x: number; z: number } | null; // only with the Prospect perk, pile still there
  player: { x: number; z: number; yaw: number };
  blips: MinimapBlip[]; // live entity positions (threats you can already see)
}

// An entity earns a blip while it is present on the floor in a non-terminal
// phase. TALLY has no body — its fake door is the tell, so it blips at the
// fake-door slot while FAKE. CINDER has no position (its tell is the sconce
// flames, already drawn as room state), so it never blips.
function blipsFor(sim: SimState): MinimapBlip[] {
  const out: MinimapBlip[] = [];
  for (const e of sim.entities) {
    switch (e.kind) {
      case 'GAUNT':
        if (e.phase === 'TELL' || e.phase === 'SWEEP') out.push({ x: e.x, z: e.z, kind: 'GAUNT' });
        break;
      case 'MURMUR':
        if (e.phase === 'HUNT' || e.phase === 'FROZEN') out.push({ x: e.x, z: e.z, kind: 'MURMUR' });
        break;
      case 'STARE':
        if (e.phase === 'TELL' || e.phase === 'ACTIVE') out.push({ x: e.x, z: e.z, kind: 'STARE' });
        break;
      case 'GRIP':
        if (e.phase === 'HUNT' || e.phase === 'FROZEN') out.push({ x: e.x, z: e.z, kind: 'GRIP' });
        break;
      case 'TALLY':
        if (e.phase === 'FAKE') out.push({ x: FAKE_DOOR_POS.x, z: FAKE_DOOR_POS.z, kind: 'TALLY' });
        break;
      case 'CINDER':
        break;
    }
  }
  return out;
}

export function minimapData(sim: SimState): MinimapData {
  const def = doorDef(sim.door);
  const geom = archetypeGeom(def.archetype);
  const showLoot = sim.perks.includes('PROSPECT') && !!def.loot && !sim.lootTaken;
  return {
    door: sim.door,
    colliders: geom.colliders,
    exit: EXIT_DOOR,
    locked: def.locked === true && !sim.inv.includes('PICK'),
    closet: def.closet ?? null,
    loot: showLoot ? geom.loot : null,
    player: { x: sim.player.x, z: sim.player.z, yaw: sim.player.yaw },
    blips: blipsFor(sim),
  };
}
