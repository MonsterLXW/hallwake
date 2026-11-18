// HALLWAKE — the four entity FSMs (architecture.md §5), pure functions.
// Triggers keyed to (doorIndex, roomTick). No RNG: every variation is a
// schedule.ts table value.

import type {
  CinderState,
  EntityState,
  GauntState,
  GripState,
  MurmurState,
  PlayerState,
  SimEvent,
  StareState,
  TallyState,
} from './types';
import type { DoorDef } from './schedule';
import { archetypeGeom, sconcePositions } from './schedule';
import { OIL_CRITICAL } from './oil';
import { NEUTRAL_ENTITY_MODS, type EntityMods } from './progression';

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

// --- Wave 2: STARE (look-away) -------------------------------------------
// Fairness contract: the chime + glyph + silhouette fire at tellTick; the
// look-check only opens STARE_TELL_LEAD ticks later (2 s of telegraph), and
// death needs STARE_GRACE_TICKS of CONTINUOUS looking. Look away and the
// counter resets. The eye hangs at STARE_EYE_Y above the floor.
export const STARE_TELL_LEAD = 120; // TELL spans tellTick..tellTick+119
export const STARE_GRACE_TICKS = 45; // 0.75 s inside the cone before death
export const STARE_CONE = (30 * Math.PI) / 180; // half-angle, yaw AND pitch
export const STARE_LINGER_TICKS = 480; // ACTIVE span after the check opens
export const STARE_EYE_Y = 1.7; // the eye floats just above eye level
export const EYE_Y = 1.6; // player camera height (mirrors scene.ts EYE)

// --- Wave 2: GRIP (chase) --------------------------------------------------
// Spawns on room entry at the schedule corner; advances GRIP_SPEED toward
// the player every tick. Kill distance is small so the counterplay is
// movement, not combat. A LIT sconce within GRIP_SCONCE_RADIUS freezes it —
// the second authored counterplay.
export const GRIP_SPEED = 1.6; // m/s — slower than the 2.2 m/s walk, always
export const GRIP_KILL_DIST = 0.9;
export const GRIP_SCONCE_RADIUS = 1.4; // player this close to a lit sconce = frozen
export const GRIP_TELL_TICK = 1; // drag-thud + glyph on the first tick in the room

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
  if (def.stare) {
    out.push({
      kind: 'STARE',
      phase: 'IDLE',
      x: def.stare.x,
      z: def.stare.z,
      stareTicks: 0,
    } as StareState);
  }
  if (def.grip) {
    out.push({
      kind: 'GRIP',
      phase: 'HUNT',
      x: def.grip.spawn.x,
      z: def.grip.spawn.z,
      dist: Number.NaN, // recomputed on first step against the player
    } as GripState);
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
  mods: EntityMods = NEUTRAL_ENTITY_MODS, // Wave 3: difficulty/IRON_NERVE stretch the react lead
): StepResult<GauntState> {
  const events: SimEvent[] = [];
  let next = g;
  const tellTick = def.gaunt!.tellTick;
  const sweepStart = tellTick + Math.round(GAUNT_TELL_LEAD * mods.react);

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

export function stepMurmur(
  m: MurmurState,
  roomTick: number,
  player: PlayerState,
  oil: number,
  door: number,
  mods: EntityMods = NEUTRAL_ENTITY_MODS, // Wave 3: react widens/narrows the step cadence
): StepResult<MurmurState> {
  const events: SimEvent[] = [];
  let next = m;

  if (m.phase === 'BANISHED') return { e: next, events }; // WARD terminal

  if (roomTick === MURMUR_TELL_TICK) {
    events.push({ type: 'tell', entity: 'MURMUR', door, visible: oil > OIL_CRITICAL });
  }

  const stepEvery = Math.max(1, Math.round(MURMUR_STEP_EVERY * mods.react));
  if (roomTick > 0 && roomTick % stepEvery === 0) {
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

// Wave 2 — is the player's full view (yaw AND pitch) inside STARE's cone?
// View vector: (cos pitch * sin yaw, sin pitch, cos pitch * cos yaw) — the
// same forward the camera rig builds (yaw 0 faces +z). The eye sits at
// STARE_EYE_Y, the camera at EYE_Y, so the vertical term is small but real:
// looking up or down off the eye always breaks the stare.
export function stareLooking(st: StareState, player: PlayerState): boolean {
  const dx = st.x - player.x;
  const dy = STARE_EYE_Y - EYE_Y;
  const dz = st.z - player.z;
  const d = Math.hypot(dx, dy, dz);
  if (d === 0) return true;
  const cp = Math.cos(player.pitch);
  const vx = cp * Math.sin(player.yaw);
  const vy = Math.sin(player.pitch);
  const vz = cp * Math.cos(player.yaw);
  return (vx * dx + vy * dy + vz * dz) / d >= Math.cos(STARE_CONE);
}

export function stepStare(
  st: StareState,
  roomTick: number,
  player: PlayerState,
  def: DoorDef,
  oil: number,
  door: number,
  mods: EntityMods = NEUTRAL_ENTITY_MODS, // Wave 3: difficulty/IRON_NERVE scale the lead + grace
): StepResult<StareState> {
  const events: SimEvent[] = [];
  let next = st;
  const tellTick = def.stare!.tellTick;
  const checkStart = tellTick + Math.round(STARE_TELL_LEAD * mods.react);
  const grace = Math.round(STARE_GRACE_TICKS * mods.react);

  if (st.phase === 'IDLE' && roomTick === tellTick) {
    next = { ...st, phase: 'TELL' };
    events.push({ type: 'tell', entity: 'STARE', door, visible: oil > OIL_CRITICAL });
  } else if (st.phase === 'TELL' && roomTick === checkStart) {
    // the look-check opens only now — the tell has already telegraphed
    next = { ...st, phase: 'ACTIVE', stareTicks: 0 };
  } else if (st.phase === 'ACTIVE') {
    if (roomTick >= checkStart + STARE_LINGER_TICKS) {
      next = { ...st, phase: 'DEPARTED' }; // survived: the eye drifts out
    } else {
      const stareTicks = stareLooking(st, player) ? st.stareTicks + 1 : 0;
      if (stareTicks > grace) return { e: { ...st, stareTicks }, events, died: true };
      next = { ...st, stareTicks };
    }
  }
  return { e: next, events };
}

export function stepGrip(
  g: GripState,
  roomTick: number,
  player: PlayerState,
  def: DoorDef,
  door: number,
  sconces: boolean[],
  mods: EntityMods = NEUTRAL_ENTITY_MODS, // Wave 3: difficulty scales the chase pressure
): StepResult<GripState> {
  const events: SimEvent[] = [];
  let next = g;
  if (g.phase === 'BANISHED') return { e: next, events }; // WARD terminal

  if (roomTick === GRIP_TELL_TICK) {
    events.push({ type: 'tell', entity: 'GRIP', door, visible: true });
  }

  // a LIT sconce is a wall of light: GRIP will not cross into it
  let frozen = false;
  if (def.grip) {
    for (let i = 0; i < 3; i++) {
      if (!sconces[i]) continue;
      const sc = sconcePositions(def)[i];
      if (Math.hypot(player.x - sc.x, player.z - sc.z) <= GRIP_SCONCE_RADIUS) {
        frozen = true;
        break;
      }
    }
  }

  if (frozen) {
    next = { ...g, phase: 'FROZEN' };
  } else {
    // HUNT (and re-engage the moment the sconce goes dark): fixed distance/tick
    const step = (GRIP_SPEED * mods.gripSpeed) / 60;
    const dx = player.x - g.x;
    const dz = player.z - g.z;
    const d = Math.hypot(dx, dz) || 1;
    next = { ...g, phase: 'HUNT', x: g.x + (dx / d) * step, z: g.z + (dz / d) * step };
  }

  const dist = Math.hypot(next.x - player.x, next.z - player.z);
  next = { ...next, dist };
  if (dist < GRIP_KILL_DIST) return { e: next, events, died: true };
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
