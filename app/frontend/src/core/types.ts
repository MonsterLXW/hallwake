// HALLWAKE core — shared types. Pure data only: no THREE, no DOM, no WebAudio.

export type EntityKind = 'GAUNT' | 'MURMUR' | 'TALLY' | 'CINDER';

export type EventType =
  | 'tell'
  | 'death'
  | 'door_open'
  | 'banish'
  | 'checkpoint'
  | 'finale';

export interface SimEvent {
  type: EventType;
  entity?: EntityKind;
  door: number;
  visible: boolean; // false when oil <= 0.20 (tell FX suppressed)
}

export interface Frame {
  mx: number; // movement intent, room-local axes, [-1,1]
  mz: number;
  yawD: number; // yaw delta applied this tick, radians
  interact: boolean;
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
  phase: 'HUNT' | 'FROZEN';
  x: number;
  z: number;
  dist: number;
}

export interface TallyState extends EntitySnapshot {
  kind: 'TALLY';
  phase: 'IDLE' | 'TELL' | 'FAKE';
}

export interface CinderState extends EntitySnapshot {
  kind: 'CINDER';
  phase: 'IDLE' | 'TELL' | 'BLACKOUT' | 'BANISHED';
  progress: number; // correct relights so far
  blackoutCount: number; // sconces extinguished by the timer
}

export type EntityState = GauntState | MurmurState | TallyState | CinderState;

export interface PlayerState {
  x: number;
  z: number;
  yaw: number;
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
}
