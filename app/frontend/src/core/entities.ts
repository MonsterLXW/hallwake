// HALLWAKE — the four entity FSMs (architecture.md §5), pure functions.
// Triggers keyed to (doorIndex, roomTick). No RNG: every variation is a
// schedule.ts table value.

import type {
  CinderState,
  EntityState,
  GauntState,
  MurmurState,
  PlayerState,
  SimEvent,
  TallyState,
} from './types';
import type { DoorDef } from './schedule';
import { archetypeGeom } from './schedule';
import { OIL_CRITICAL } from './oil';

export const GAUNT_TELL_TICK = 60; // lights flicker twice, burn amber
export const GAUNT_TELL_LEAD = 145; // TELL spans tellTick..tellTick+144, sweep starts after
export const GAUNT_SWEEP_TICKS = 360; // 6.0 s at 3.5 m/s
export const GAUNT_SPEED = 3.5;
export const GAUNT_STILL_SPEED = 0.2; // |vel| must stay under this

export const MURMUR_STEP_EVERY = 60; // one 1.2 m step per second outside the cone
export const MURMUR_STEP = 1.2;
export const MURMUR_CONE = (25 * Math.PI) / 180;
export const MURMUR_KILL_DIST = 1.5;

export const MURMUR_TELL_TICK = 60; // whisper grows with facing dot

export const TALLY_TELL_TICK = 60; // chalk marks + one 1 s red beat
export const TALLY_FAKE_TICK = 120; // duplicate door spawns

export const CINDER_TELL_TICK = 60; // blue flames, hiss, oil x4
export const CINDER_BLACKOUT_TICK = 120; // sconces start dying
export const CINDER_EXTINGUISH_TICKS = [120, 300, 480]; // one per 3 s

const TWO_PI = Math.PI * 2;

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= TWO_PI;
  while (d < -Math.PI) d += TWO_PI;
  return d;
}

export function buildEntities(def: DoorDef): EntityState[] {
  const out: EntityState[] = [];
  if (def.gaunt) {
    out.push({
      kind: 'GAUNT',
      phase: 'IDLE',
      hiddenOk: true,
      x: def.gaunt.waypoints[0][0],
      z: def.gaunt.waypoints[0][1],
    } as GauntState);
  }
  if (def.murmurSpawn) {
    out.push({
      kind: 'MURMUR',
      phase: 'HUNT',
      x: def.murmurSpawn.x,
      z: def.murmurSpawn.z,
      dist: Number.NaN, // recomputed on first step against the player
    } as MurmurState);
  }
  if (def.tallyFakeNum !== undefined) {
    out.push({ kind: 'TALLY', phase: 'IDLE' } as TallyState);
  }
  if (def.cinderOrder) {
    out.push({ kind: 'CINDER', phase: 'IDLE', progress: 0, blackoutCount: 0 } as CinderState);
  }
  return out;
}

export interface StepResult<T> {
  e: T;
  events: SimEvent[];
  died?: boolean;
}

export function stepGaunt(
  g: GauntState,
  roomTick: number,
  player: PlayerState,
  def: DoorDef,
  oil: number,
  door: number,
  hidden = false,
): StepResult<GauntState> {
  const events: SimEvent[] = [];
  let next = g;
  const tellTick = def.gaunt!.tellTick;
  const sweepStart = tellTick + GAUNT_TELL_LEAD;

  if (g.phase === 'IDLE' && roomTick === tellTick) {
    next = { ...g, phase: 'TELL' };
    events.push({ type: 'tell', entity: 'GAUNT', door, visible: oil > OIL_CRITICAL });
  } else if (g.phase === 'TELL' && roomTick === sweepStart) {
    next = { ...g, phase: 'SWEEP', hiddenOk: true };
  } else if (g.phase === 'SWEEP') {
    // advance along the fixed sweep path for the renderer
    const [w0, w1] = def.gaunt!.waypoints;
    const segLen = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]);
    const travelled = Math.min(segLen, (roomTick - sweepStart) * (GAUNT_SPEED / 60));
    const t = segLen === 0 ? 0 : travelled / segLen;
    next = { ...g, x: w0[0] + (w1[0] - w0[0]) * t, z: w0[1] + (w1[1] - w0[1]) * t };

    if (roomTick < sweepStart + GAUNT_SWEEP_TICKS) {
      const alcove = archetypeGeom(def.archetype).alcoves[def.gaunt!.alcoveIndex];
      const speed = Math.hypot(player.vel.x, player.vel.z);
      const inAlcove =
        player.x >= alcove.x0 && player.x <= alcove.x1 &&
        player.z >= alcove.z0 && player.z <= alcove.z1 &&
        speed < GAUNT_STILL_SPEED;
      // Wave 1: a closed closet door is a wall — hidden is always safe, and
      // it never latches hiddenOk false even if you were caught moving first.
      if (!hidden && !inAlcove) next = { ...next, hiddenOk: false };
    } else {
      // resolve at the end of the sweep duration
      if (next.hiddenOk || hidden) {
        next = { ...next, phase: 'SURVIVED' };
      } else {
        return { e: next, events, died: true };
      }
    }
  }
  return { e: next, events };
}

export function stepMurmur(m: MurmurState, roomTick: number, player: PlayerState, oil: number, door: number): StepResult<MurmurState> {
  const events: SimEvent[] = [];
  let next = m;

  if (m.phase === 'BANISHED') return { e: next, events }; // WARD terminal

  if (roomTick === MURMUR_TELL_TICK) {
    events.push({ type: 'tell', entity: 'MURMUR', door, visible: oil > OIL_CRITICAL });
  }

  if (roomTick > 0 && roomTick % MURMUR_STEP_EVERY === 0) {
    const bearing = Math.atan2(m.x - player.x, m.z - player.z);
    const inCone = Math.abs(angleDiff(player.yaw, bearing)) <= MURMUR_CONE && oil > OIL_CRITICAL;
    if (inCone) {
      next = { ...next, phase: 'FROZEN' };
    } else {
      const dx = player.x - m.x;
      const dz = player.z - m.z;
      const d = Math.hypot(dx, dz) || 1;
      next = { ...next, phase: 'HUNT', x: m.x + (dx / d) * MURMUR_STEP, z: m.z + (dz / d) * MURMUR_STEP };
    }
  }

  const dist = Math.hypot(next.x - player.x, next.z - player.z);
  next = { ...next, dist };
  if (dist < MURMUR_KILL_DIST) return { e: next, events, died: true };
  return { e: next, events };
}

export function stepTally(t: TallyState, roomTick: number, oil: number, door: number): StepResult<TallyState> {
  const events: SimEvent[] = [];
  let next = t;
  if (t.phase === 'BANISHED') return { e: next, events }; // WARD terminal
  if (t.phase === 'IDLE' && roomTick === TALLY_TELL_TICK) {
    next = { ...t, phase: 'TELL' };
    events.push({ type: 'tell', entity: 'TALLY', door, visible: oil > OIL_CRITICAL });
  } else if (t.phase === 'TELL' && roomTick === TALLY_FAKE_TICK) {
    next = { ...t, phase: 'FAKE' };
  }
  return { e: next, events };
}

export function stepCinder(c: CinderState, roomTick: number, oil: number, door: number): StepResult<CinderState> {
  const events: SimEvent[] = [];
  let next = c;
  if (c.phase === 'IDLE' && roomTick === CINDER_TELL_TICK) {
    next = { ...c, phase: 'TELL' };
    events.push({ type: 'tell', entity: 'CINDER', door, visible: oil > OIL_CRITICAL });
  } else if (c.phase === 'TELL' && roomTick === CINDER_BLACKOUT_TICK) {
    next = { ...c, phase: 'BLACKOUT', blackoutCount: 1 };
  } else if (c.phase === 'BLACKOUT') {
    const count = CINDER_EXTINGUISH_TICKS.filter((t) => roomTick >= t).length;
    if (count !== c.blackoutCount) next = { ...c, blackoutCount: count };
  }
  return { e: next, events };
}

// Derived sconce lit flags: a sconce is lit unless the blackout timer has
// taken it AND it has not been relit in the correct scratch order yet.
export function sconceFlags(c: CinderState, def: DoorDef): boolean[] {
  const order = def.cinderOrder!;
  const relit = new Set(order.slice(0, c.progress));
  return [0, 1, 2].map((i) => i >= c.blackoutCount || relit.has(i));
}

export function cinderActive(entities: EntityState[]): boolean {
  return entities.some((e) => e.kind === 'CINDER' && (e.phase === 'TELL' || e.phase === 'BLACKOUT'));
}
