// HALLWAKE core — shared types. Pure data only: no THREE, no DOM, no WebAudio.

import type { Difficulty, PerkId } from './progression';

// Wave 2 roster (features.md): STARE = look-away threat, GRIP = corridor chase.
export type EntityKind = 'GAUNT' | 'MURMUR' | 'TALLY' | 'CINDER' | 'STARE' | 'GRIP';

// Wave 1 kit items (features.md): WARD banishes the killing entity, TONIC
// survives one hit, PICK opens a locked exit door, FLASK is +0.5 oil on use.
export type ItemType = 'WARD' | 'TONIC' | 'PICK' | 'FLASK';

export type EventType =
  | 'tell'
  | 'death'
  | 'door_open'
  | 'banish'
  | 'checkpoint'
  | 'finale'
  | 'loot' // picked up an item
  | 'coin' // collected coins
  | 'item_use' // consumed an item (item field says which)
  | 'lock' // locked exit opened with a PICK
  | 'hide' // entered/exited a closet
  | 'perk' // a level-up perk was chosen (perk field says which)
  | 'shop' // bought an offer from the threshold keeper (item field says which)
  | 'secret'; // the hidden alcove was opened (item field says the bonus loot)

export interface SimEvent {
  type: EventType;
  entity?: EntityKind;
  item?: ItemType;
  perk?: PerkId; // Wave 3: set on 'perk' events
  door: number;
  visible: boolean; // false when oil <= 0.20 (tell FX suppressed)
}

export interface Frame {
  mx: number; // movement intent, room-local axes, [-1,1]
  mz: number;
  yawD: number; // yaw delta applied this tick, radians
  pitchD?: number; // Wave 2: pitch delta this tick (STARE reads the full view)
  interact: boolean;
  use?: number; // inventory slot 0..3 actively used this tick (number keys)
  perk?: PerkId; // Wave 3: perk chosen at the level-up overlay (applied once, only if offered)
}

export interface EntitySnapshot {
  kind: EntityKind;
  phase: string;
  dist?: number;
}

export interface GauntState extends EntitySnapshot {
  kind: 'GAUNT';
  phase: 'IDLE' | 'TELL' | 'SWEEP' | 'SURVIVED';
  hiddenOk: boolean;
  x: number; // sweep position, consumed by the renderer
  z: number;
}

export interface MurmurState extends EntitySnapshot {
  kind: 'MURMUR';
  phase: 'HUNT' | 'FROZEN' | 'BANISHED';
  x: number;
  z: number;
  dist: number;
}

export interface TallyState extends EntitySnapshot {
  kind: 'TALLY';
  phase: 'IDLE' | 'TELL' | 'FAKE' | 'BANISHED';
}

export interface CinderState extends EntitySnapshot {
  kind: 'CINDER';
  phase: 'IDLE' | 'TELL' | 'BLACKOUT' | 'BANISHED';
  progress: number; // correct relights so far
  blackoutCount: number; // sconces extinguished by the timer
}

// Wave 2 — STARE (look-away): manifests at a fixed door/tick; while ACTIVE,
// holding the view inside its cone past a short fixed grace is lethal.
// DEPARTED is the survived terminal; BANISHED is the WARD terminal.
export interface StareState extends EntitySnapshot {
  kind: 'STARE';
  phase: 'IDLE' | 'TELL' | 'ACTIVE' | 'DEPARTED' | 'BANISHED';
  x: number; // fixed manifest position (schedule-authored)
  z: number;
  stareTicks: number; // consecutive ticks the view has been inside the cone
}

// Wave 2 — GRIP (chase): spawns on room entry at a fixed corner and advances
// a fixed distance/tick toward the player. FROZEN while the player stands by
// a LIT sconce — the sconce light is the second counterplay.
export interface GripState extends EntitySnapshot {
  kind: 'GRIP';
  phase: 'HUNT' | 'FROZEN' | 'BANISHED';
  x: number;
  z: number;
  dist: number;
}

export type EntityState = GauntState | MurmurState | TallyState | CinderState | StareState | GripState;

export interface PlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number; // Wave 2: vertical look, clamped; STARE reads yaw AND pitch
  vel: { x: number; z: number };
}

export interface SimState {
  tick: number;
  door: number; // room the player is in, 1..24
  roomTick: number; // ticks since entering this room
  player: PlayerState;
  oil: number; // 0..1
  alive: boolean;
  checkpoint: number; // door number of last checkpoint
  deaths: number;
  runMs: number;
  doorLog: number; // next expected door number (door + 1)
  sconces: boolean[]; // 3 sconce lit flags (CINDER rooms)
  entities: EntityState[];
  events: SimEvent[]; // events emitted on the latest tick
  freeze: number; // death-freeze ticks remaining
  deepest: number; // deepest door reached this run
  finished: boolean; // finale survived
  oilCanUsed: boolean;
  // --- Wave 1: kit, loot, coins, closets, death-saves (features.md) ---
  inv: ItemType[]; // carried kit, cap INV_CAP (4)
  coins: number; // run currency, collected from authored coin piles
  hidden: boolean; // inside a closet: movement locked, GAUNT sweep cannot reach
  lootTaken: boolean; // this room's authored loot pile already picked up
  coinsTaken: boolean; // this room's authored coin pile already collected
  invuln: number; // ticks of TONIC grace remaining (death checks skipped)
  // --- Wave 3: XP, perks, difficulty (features.md) ---
  xp: number; // earned from fixed events only: doors survived, banishes, loot
  perks: PerkId[]; // chosen perks, in pick order; the sim applies their multipliers
  difficulty: Difficulty; // attract-screen mode; pure multipliers, no RNG
  // --- Wave 4: hidden room (features.md) ---
  secretFound: boolean; // this room's authored secret alcove already opened
}
