// HALLWAKE — the deterministic sim reducer. stepSim(state, frame) -> state is
// pure: fixed dt = 1/60, no RNG, no DOM/THREE. Same input stream in ->
// identical state out (proven by the golden traces).

import type { EntityKind, EntityState, Frame, ItemType, SimEvent, SimState } from './types';
import type { Difficulty, PerkId } from './progression';
import {
  DIFFICULTY_MODS,
  FASTER_WALK_MULT,
  XP_BANISH,
  XP_DOOR,
  XP_LOOT,
  checkpointDoors,
  entityMods,
  perkChoices,
  xpLevel,
} from './progression';
import type { DoorDef } from './schedule';
import {
  ENTRY,
  EXIT_DOOR,
  FAKE_DOOR_POS,
  INTERACT_RANGE,
  ROOM_D,
  ROOM_W,
  archetypeGeom,
  doorDef,
  sconcePositions,
} from './schedule';
import {
  buildEntities,
  cinderActive,
  sconceFlags,
  stepCinder,
  stepGaunt,
  stepGrip,
  stepMurmur,
  stepStare,
  stepTally,
} from './entities';
import { OIL_BANISH_FLOOR, OIL_CINDER_MULT, OIL_REFILL, OIL_RESPAWN, drainOil, refillOil } from './oil';

export const WALK_SPEED = 2.2; // m/s, no sprint (booth)
export const DEATH_FREEZE_TICKS = 90; // 1.5 s death freeze
export const INV_CAP = 4; // Wave 1: kit slots (features.md)
export const TONIC_INVULN_TICKS = 180; // Wave 1: 3 s of grace after a TONIC save
export const FLASK_OIL = 0.5; // Wave 1: FLASK is an instant +0.5 oil drink
export const GRIP_TONIC_KNOCKBACK = 3; // Wave 2: a TONIC shock shoves GRIP back 3 m
const PLAYER_RADIUS = 0.3;
export const PITCH_LIMIT = Math.PI / 2 - 0.05; // Wave 2: the view never flips over
const clampPitch = (v: number): number => (v < -PITCH_LIMIT ? -PITCH_LIMIT : v > PITCH_LIMIT ? PITCH_LIMIT : v);

function nearestCheckpoint(door: number, difficulty: Difficulty): number {
  let best = 1;
  for (const c of checkpointDoors(difficulty)) if (c <= door) best = c;
  return best;
}

// Wave 1 death-saves (features.md): TONIC survives the hit and grants brief
// grace; WARD banishes the killer into its terminal phase. Returns the saved
// state, or null when the kit cannot save (the caller then kills normally).
// The caller's `events` array receives the item_use / banish events.
function tryDeathSave(s: SimState, killer: EntityKind, events: SimEvent[]): SimState | null {
  const ti = s.inv.indexOf('TONIC');
  if (ti >= 0) {
    const inv = [...s.inv];
    inv.splice(ti, 1);
    // the save must be real: a GAUNT sweep survived is over, a STARE that
    // just killed you is already drifting out, and GRIP takes a 3 m shock
    // back down the corridor so the 3 s of grace is usable time.
    const entities = s.entities.map((e) => {
      if (e.kind !== killer) return e;
      if (e.kind === 'GAUNT') return { ...e, phase: 'SURVIVED' as const };
      if (e.kind === 'STARE') return { ...e, phase: 'DEPARTED' as const, stareTicks: 0 };
      if (e.kind === 'GRIP') {
        const dx = e.x - s.player.x;
        const dz = e.z - s.player.z;
        const d = Math.hypot(dx, dz) || 1;
        const x = Math.min(ROOM_W - 0.2, Math.max(0.2, e.x + (dx / d) * GRIP_TONIC_KNOCKBACK));
        const z = Math.min(ROOM_D - 0.2, Math.max(0.2, e.z + (dz / d) * GRIP_TONIC_KNOCKBACK));
        return { ...e, x, z };
      }
      return e;
    });
    events.push({ type: 'item_use', item: 'TONIC', door: s.door, visible: true });
    return { ...s, inv, entities, invuln: TONIC_INVULN_TICKS };
  }
  const wi = s.inv.indexOf('WARD');
  if (wi >= 0) {
    const inv = [...s.inv];
    inv.splice(wi, 1);
    const entities = s.entities.map((e) => {
      if (e.kind !== killer) return e;
      if (e.kind === 'GAUNT') return { ...e, phase: 'SURVIVED' as const };
      return { ...e, phase: 'BANISHED' as const };
    });
    events.push({ type: 'item_use', item: 'WARD', door: s.door, visible: true });
    events.push({ type: 'banish', entity: killer, door: s.door, visible: true });
    return { ...s, inv, entities, xp: s.xp + XP_BANISH }; // Wave 3: a banish banks XP
  }
  return null;
}

// Sconces start LIT in CINDER rooms (the blackout takes them) and in GRIP
// rooms (Wave 2: the lit sconce is the authored stand-your-ground counter).
function initialSconces(def: DoorDef): boolean[] {
  return def.cinderOrder !== undefined || def.grip !== undefined ? [true, true, true] : [false, false, false];
}

export function makeRoomState(
  door: number,
  oil: number,
  difficulty: Difficulty = 'NORMAL',
  perks: PerkId[] = [],
): SimState {
  const def = doorDef(door);
  return {
    tick: 0,
    door,
    roomTick: 0,
    player: { x: ENTRY.x, z: ENTRY.z, yaw: 0, pitch: 0, vel: { x: 0, z: 0 } },
    oil,
    alive: true,
    checkpoint: nearestCheckpoint(door, difficulty),
    deaths: 0,
    runMs: 0,
    doorLog: door + 1,
    sconces: initialSconces(def),
    entities: buildEntities(def),
    events: [],
    freeze: 0,
    deepest: door,
    finished: false,
    oilCanUsed: false,
    inv: [],
    coins: 0,
    hidden: false,
    lootTaken: false,
    coinsTaken: false,
    invuln: 0,
    xp: 0,
    perks: [...perks],
    difficulty,
  };
}

export function createInitialState(seed: number, difficulty: Difficulty = 'NORMAL', perks: PerkId[] = []): SimState {
  // The schedule is fixed; the seed is only a run id (leaderboard), never RNG.
  void seed;
  const s = makeRoomState(1, 1, difficulty, perks);
  // Wave 3: EXTRA_TONIC — the kit starts the run with a tonic.
  return perks.includes('EXTRA_TONIC') ? { ...s, inv: ['TONIC'] } : s;
}

function collide(x: number, z: number, def: ReturnType<typeof doorDef>): { x: number; z: number } {
  // room bounds
  let px = Math.min(ROOM_W - 0.2, Math.max(0.2, x));
  let pz = Math.min(ROOM_D - 0.2, Math.max(0.2, z));
  // per-room AABB props: push the player point out of the expanded box
  for (const b of archetypeGeom(def.archetype).colliders) {
    const x0 = b.x0 - PLAYER_RADIUS, x1 = b.x1 + PLAYER_RADIUS;
    const z0 = b.z0 - PLAYER_RADIUS, z1 = b.z1 + PLAYER_RADIUS;
    if (px > x0 && px < x1 && pz > z0 && pz < z1) {
      const dl = px - x0, dr = x1 - px, db = pz - z0, dt = z1 - pz;
      const m = Math.min(dl, dr, db, dt);
      if (m === dl) px = x0;
      else if (m === dr) px = x1;
      else if (m === db) pz = z0;
      else pz = z1;
    }
  }
  return { x: px, z: pz };
}

const dist2 = (ax: number, az: number, b: { x: number; z: number }) => Math.hypot(ax - b.x, az - b.z);

export function stepSim(state: SimState, frame: Frame): SimState {
  if (state.finished) return { ...state, events: [] };

  let s: SimState = { ...state, tick: state.tick + 1, runMs: state.runMs + 1000 / 60, events: [] };

  // --- death freeze / respawn -------------------------------------------
  if (!s.alive) {
    const freeze = s.freeze - 1;
    if (freeze > 0) return { ...s, freeze };
    const rs = makeRoomState(s.checkpoint, OIL_RESPAWN, s.difficulty, s.perks);
    return {
      ...rs,
      tick: s.tick,
      runMs: s.runMs,
      deaths: s.deaths + 1,
      checkpoint: s.checkpoint,
      deepest: s.deepest,
      inv: s.inv, // the kit and the coin purse survive a death
      coins: s.coins,
      xp: s.xp, // Wave 3: XP and chosen perks survive a death
      events: [],
    };
  }

  s = { ...s, roomTick: s.roomTick + 1 };
  if (s.invuln > 0) s = { ...s, invuln: s.invuln - 1 };
  const def = doorDef(s.door);
  const events: SimEvent[] = [];

  // Wave 3: a level-up perk choice arrives as a Frame field (the overlay /
  // autopilot sends it). Applied once, only while a pick is pending and only
  // from the deterministically offered list.
  if (
    frame.perk !== undefined &&
    s.perks.length < xpLevel(s.xp) &&
    perkChoices(s.perks).includes(frame.perk)
  ) {
    s = { ...s, perks: [...s.perks, frame.perk] };
    if (frame.perk === 'EXTRA_TONIC' && s.inv.length < INV_CAP) s = { ...s, inv: [...s.inv, 'TONIC'] };
    events.push({ type: 'perk', perk: frame.perk, door: s.door, visible: true });
  }

  // --- movement ----------------------------------------------------------
  let mx = frame.mx, mz = frame.mz;
  if (s.hidden) { mx = 0; mz = 0; } // Wave 1: a closed closet locks movement
  const mag = Math.hypot(mx, mz);
  if (mag > 1) { mx /= mag; mz /= mag; }
  // Wave 3: FASTER_WALK is a small fixed multiplier on the walk.
  const speed = WALK_SPEED * (s.perks.includes('FASTER_WALK') ? FASTER_WALK_MULT : 1);
  const vel = { x: mx * speed, z: mz * speed };
  const pos = collide(s.player.x + vel.x / 60, s.player.z + vel.z / 60, def);
  s = {
    ...s,
    player: {
      ...s.player,
      x: pos.x,
      z: pos.z,
      yaw: s.player.yaw + frame.yawD,
      pitch: clampPitch(s.player.pitch + (frame.pitchD ?? 0)), // Wave 2: the sim owns the view
      vel,
    },
  };

  // --- oil drain (x4 while CINDER active; difficulty scales the burn) -----
  const active = cinderActive(s.entities);
  s = { ...s, oil: drainOil(s.oil, (active ? OIL_CINDER_MULT : 1) * DIFFICULTY_MODS[s.difficulty].oilDrain) };

  // --- interact ----------------------------------------------------------
  if (frame.interact) {
    let acted = false;
    const tally = s.entities.find((e) => e.kind === 'TALLY');
    const cinder = s.entities.find((e) => e.kind === 'CINDER');

    if (tally && tally.phase === 'FAKE' && dist2(s.player.x, s.player.z, FAKE_DOOR_POS) <= INTERACT_RANGE) {
      // the fake door is a mouth — death-saves apply before it can kill
      if (s.invuln > 0) {
        acted = true; // TONIC grace: the bite misses
      } else {
        const saved = tryDeathSave(s, 'TALLY', events);
        if (!saved) {
          return {
            ...s,
            alive: false,
            freeze: DEATH_FREEZE_TICKS,
            events: [{ type: 'death', entity: 'TALLY', door: s.door, visible: true }],
          };
        }
        s = saved;
        acted = true;
      }
    }

    if (cinder && cinder.phase === 'BLACKOUT' && def.cinderOrder) {
      const sconces = sconcePositions(def);
      let hit = -1, best = INTERACT_RANGE;
      sconces.forEach((p, i) => {
        const d = dist2(s.player.x, s.player.z, p);
        if (d <= best) { best = d; hit = i; }
      });
      if (hit >= 0) {
        acted = true;
        const order = def.cinderOrder;
        if (hit === order[cinder.progress]) {
          const progress = cinder.progress + 1;
          const entities = s.entities.map((e) => (e === cinder ? { ...cinder, progress } : e));
          const banished = progress >= 3;
          const oil = banished
            ? Math.max(refillOil(s.oil, OIL_REFILL), OIL_BANISH_FLOOR)
            : refillOil(s.oil, OIL_REFILL);
          if (banished) events.push({ type: 'banish', entity: 'CINDER', door: s.door, visible: true });
          const ns: SimState = {
            ...s,
            entities: banished
              ? entities.map((e) => (e.kind === 'CINDER' ? { ...e, phase: 'BANISHED' } : e))
              : entities,
            sconces: sconceFlags({ ...cinder, progress }, def),
            oil,
            xp: s.xp + (banished ? XP_BANISH : 0), // Wave 3: a banish banks XP
          };
          s = ns;
        } else {
          // wrong scratch order resets the sequence
          s = {
            ...s,
            entities: s.entities.map((e) => (e === cinder ? { ...cinder, progress: 0 } : e)),
            sconces: sconceFlags({ ...cinder, progress: 0 }, def),
          };
        }
      }
    }

    const geom = archetypeGeom(def.archetype);
    if (!s.oilCanUsed && dist2(s.player.x, s.player.z, geom.oilCan) <= INTERACT_RANGE) {
      s = { ...s, oil: refillOil(s.oil, OIL_REFILL), oilCanUsed: true };
      acted = true;
    }

    // Wave 1: an authored loot pile — pick it up while the kit has a slot
    if (def.loot && !s.lootTaken && dist2(s.player.x, s.player.z, geom.loot) <= INTERACT_RANGE) {
      if (s.inv.length < INV_CAP) {
        s = { ...s, inv: [...s.inv, def.loot], lootTaken: true, xp: s.xp + XP_LOOT };
        events.push({ type: 'loot', item: def.loot, door: s.door, visible: true });
        acted = true;
      }
    }

    // Wave 1: an authored coin pile
    if (def.coins && !s.coinsTaken && dist2(s.player.x, s.player.z, geom.coins) <= INTERACT_RANGE) {
      s = { ...s, coins: s.coins + def.coins, coinsTaken: true };
      events.push({ type: 'coin', door: s.door, visible: true });
      acted = true;
    }

    // Wave 1: closet — E near the closet toggles hidden (enter / exit).
    // While hidden, movement is locked and the GAUNT sweep cannot reach.
    if (def.closet) {
      const cc = { x: (def.closet.x0 + def.closet.x1) / 2, z: (def.closet.z0 + def.closet.z1) / 2 };
      if (dist2(s.player.x, s.player.z, cc) <= INTERACT_RANGE) {
        s = s.hidden
          ? { ...s, hidden: false }
          : { ...s, hidden: true, player: { ...s.player, x: cc.x, z: cc.z, vel: { x: 0, z: 0 } } };
        events.push({ type: 'hide', door: s.door, visible: true });
        acted = true;
      }
    }

    if (dist2(s.player.x, s.player.z, EXIT_DOOR) <= INTERACT_RANGE && s.door < 24) {
      acted = true;
      let open = !def.locked;
      if (def.locked) {
        // Wave 1: a locked exit opens only by spending a PICK from the kit;
        // without one the HUD prompt says why (see loop.ts promptFor).
        const pi = s.inv.indexOf('PICK');
        if (pi >= 0) {
          const inv = [...s.inv];
          inv.splice(pi, 1);
          s = { ...s, inv };
          events.push({ type: 'item_use', item: 'PICK', door: s.door, visible: true });
          events.push({ type: 'lock', door: s.door, visible: true });
          open = true;
        }
      }
      if (open) {
        const nd = s.door + 1;
        const ndef = doorDef(nd);
        // Wave 3: checkpoint spacing follows the difficulty table, not the
        // schedule flag (identical at Normal).
        const isCp = checkpointDoors(s.difficulty).includes(nd);
        const ev: SimEvent[] = [{ type: 'door_open', door: nd, visible: true }];
        if (isCp) ev.push({ type: 'checkpoint', door: nd, visible: true });
        return {
          ...s,
          door: nd,
          roomTick: 0,
          doorLog: nd + 1,
          player: { ...s.player, x: ENTRY.x, z: ENTRY.z, vel: { x: 0, z: 0 } },
          entities: buildEntities(ndef),
          sconces: initialSconces(ndef),
          checkpoint: isCp ? nd : s.checkpoint,
          deepest: Math.max(s.deepest, nd),
          oilCanUsed: false,
          hidden: false,
          lootTaken: false,
          coinsTaken: false,
          invuln: 0,
          xp: s.xp + XP_DOOR, // Wave 3: a door survived banks XP
          events: [...events, ...ev],
        };
      }
    }

    // Wave 1: FLASK fallback — E with nothing else in range drinks +0.5 oil
    if (!acted) {
      const fi = s.inv.indexOf('FLASK');
      if (fi >= 0) {
        const inv = [...s.inv];
        inv.splice(fi, 1);
        s = { ...s, inv, oil: refillOil(s.oil, FLASK_OIL) };
        events.push({ type: 'item_use', item: 'FLASK', door: s.door, visible: true });
      }
    }
  }

  // Wave 1: number-key item use (slot 0..3). Only FLASK is drinkable;
  // WARD/TONIC/PICK are passive (death-saves / lock consumption).
  if (frame.use !== undefined && frame.use >= 0 && frame.use < s.inv.length && s.inv[frame.use] === 'FLASK') {
    const inv = [...s.inv];
    inv.splice(frame.use, 1);
    s = { ...s, inv, oil: refillOil(s.oil, FLASK_OIL) };
    events.push({ type: 'item_use', item: 'FLASK', door: s.door, visible: true });
  }

  // --- entity FSMs --------------------------------------------------------
  // Wave 3: difficulty + perks reach the FSMs as pure multipliers (Normal +
  // no perks = the shipped constants, so every trace runs unchanged).
  const mods = entityMods(s.difficulty, s.perks);
  let died: SimEvent | null = null;
  const entities: EntityState[] = [];
  for (const e of s.entities) {
    let r: { e: EntityState; events: SimEvent[]; died?: boolean };
    switch (e.kind) {
      case 'GAUNT': r = stepGaunt(e, s.roomTick, s.player, def, s.oil, s.door, s.hidden, mods); break;
      case 'MURMUR': r = stepMurmur(e, s.roomTick, s.player, s.oil, s.door, mods); break;
      case 'TALLY': r = stepTally(e, s.roomTick, s.oil, s.door); break;
      case 'CINDER': r = stepCinder(e, s.roomTick, s.oil, s.door); break;
      case 'STARE': r = stepStare(e, s.roomTick, s.player, def, s.oil, s.door, mods); break;
      case 'GRIP': r = stepGrip(e, s.roomTick, s.player, def, s.door, s.sconces, mods); break;
    }
    entities.push(r.e);
    events.push(...r.events);
    if (r.died && !died) died = { type: 'death', entity: e.kind, door: s.door, visible: true };
  }
  s = { ...s, entities };

  // CINDER rooms: keep the derived sconce flags in sync with the FSM
  const cinder = entities.find((e) => e.kind === 'CINDER');
  if (cinder && def.cinderOrder) s = { ...s, sconces: sconceFlags(cinder, def) };

  // finale: both threats resolved -> the corridor releases the player
  if (s.door === 24 && def.event === 'FINALE') {
    const c = entities.find((e) => e.kind === 'CINDER');
    const g = entities.find((e) => e.kind === 'GAUNT');
    if (c && c.phase === 'BANISHED' && g && g.phase === 'SURVIVED') {
      events.push({ type: 'finale', door: 24, visible: true });
      s = { ...s, finished: true };
    }
  }

  // oil starvation in a CINDER room: early GAUNT, death
  if (cinderActive(entities) && s.oil <= 0 && !died) {
    died = { type: 'death', entity: 'GAUNT', door: s.door, visible: true };
  }

  // Wave 1: TONIC grace — while invuln > 0, lethal hits simply miss.
  if (died && s.invuln > 0) died = null;

  if (died) {
    const saved = tryDeathSave(s, died.entity!, events);
    if (saved) {
      s = saved; // TONIC/WARD consumed the hit; the run continues
    } else {
      events.push(died);
      return { ...s, alive: false, freeze: DEATH_FREEZE_TICKS, events, deepest: Math.max(s.deepest, s.door) };
    }
  }

  return { ...s, events, deepest: Math.max(s.deepest, s.door) };
}
