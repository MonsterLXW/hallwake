// HALLWAKE — the fixed-timestep loop (architecture.md §13). Accumulator at
// dt=1/60, max 5 catch-up steps then drop the backlog. The renderer reads the
// latest SimState; stepSim is the only thing that mutates game state (the
// renderer never writes back). HUD snapshots go to uiStore at 10Hz. The
// autopilot is the dev entry that plays doors 1-24 hands-free (?auto=1) so
// the orchestrator's browser perf gate can measure a real full-corridor run.

import { createInitialState, stepSim } from '../core/sim';
import {
  EXIT_DOOR,
  INTERACT_RANGE,
  archetypeGeom,
  doorDef,
  sconcePositions,
} from '../core/schedule';
import type { Archetype } from '../core/schedule';
import type { EntityKind, Frame, SimEvent, SimState } from '../core/types';
import type { SceneBundle } from './scene';
import type { PlayerController } from './playerController';
import { mountEntities } from './entities/fx';
import { createAudioGraph } from '../audio/graph';

export const DT = 1 / 60;
export const MAX_CATCHUP_STEPS = 5;

export interface HudSnapshot {
  door: number;
  doorLog: number;
  oil: number;
  alive: boolean;
  tellKind: EntityKind | null;
  interactPrompt: string | null; // '[E] OPEN 06' surface text, in range only
  checkpoint: number;
  deaths: number;
  runMs: number;
  deepest: number;
}

export type RunPhase = 'playing' | 'dead' | 'run';

export interface LoopDeps {
  scene: SceneBundle;
  controller: PlayerController;
  seed: number;
  autopilot: boolean;
  isPaused(): boolean;
  onHud(h: HudSnapshot): void;
  onPhase(p: RunPhase): void;
  /** T4: every SimEvent is also streamed to the shell (lore/epitaph hooks). */
  onEvent?(ev: SimEvent): void;
  /** Kiosk idle: fired once per non-zero input frame — the ONLY activity
      signal for gamepad-only players (no key/pointer listeners fire). */
  onActivity?(): void;
}

// A frame counts as booth activity if it carries any input at all. Pure +
// exported so the kiosk contract is unit-testable without RAF/WebGL.
export function frameHasInput(f: Frame): boolean {
  return f.mx !== 0 || f.mz !== 0 || f.yawD !== 0 || f.interact;
}

export interface LoopHandle {
  stop(): void;
  fps(): number;
  state(): SimState;
  /** Kiosk reset: fresh sim at door 1 with a new run id, scene untouched. */
  reset(seed: number): void;
  /** Gamepad begins never fire key/pointer listeners: wake the graph here. */
  wakeAudio(): void;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

// The interact prompt is derived from sim state only (the HUD never guesses):
// exit door in range -> OPEN nn, blackout sconce in range -> RELIGHT,
// unused oil can in range -> OIL CAN.
function promptFor(sim: SimState): string | null {
  if (!sim.alive || sim.finished) return null;
  const def = doorDef(sim.door);
  const p = sim.player;
  if (sim.door < 24 && Math.hypot(p.x - EXIT_DOOR.x, p.z - EXIT_DOOR.z) <= INTERACT_RANGE) {
    return `OPEN ${pad2(sim.doorLog)}`;
  }
  const cinder = sim.entities.find((e) => e.kind === 'CINDER');
  if (cinder && cinder.phase === 'BLACKOUT' && def.cinderOrder) {
    for (const sc of sconcePositions(def)) {
      if (Math.hypot(p.x - sc.x, p.z - sc.z) <= INTERACT_RANGE) return 'RELIGHT';
    }
  }
  if (!sim.oilCanUsed) {
    const can = archetypeGeom(def.archetype).oilCan;
    if (Math.hypot(p.x - can.x, p.z - can.z) <= INTERACT_RANGE) return 'OIL CAN';
  }
  return null;
}

const clamp1 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

// Deterministic scripted player: walks the corridor lane for each archetype,
// opens real doors, relights CINDER sconces in the door's scratch order,
// hides in the alcove during a GAUNT sweep, keeps the beam on MURMUR.
export function createAutopilot(): (s: SimState) => Frame {
  const f: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };
  let prevWant = false;
  const laneX: Record<Archetype, number> = {
    junction: 7,
    guest: 7,
    laundry: 7,
    lounge: 7.7,
    boiler: 9.2,
    washroom: 7,
  };
  return (s: SimState): Frame => {
    f.mx = 0;
    f.mz = 0;
    f.yawD = 0;
    f.interact = false;
    if (!s.alive || s.finished) return f;

    const def = doorDef(s.door);
    const p = s.player;
    const gaunt = s.entities.find((e) => e.kind === 'GAUNT');
    const cinder = s.entities.find((e) => e.kind === 'CINDER');
    const murmur = s.entities.find((e) => e.kind === 'MURMUR');
    const gauntLive = !!gaunt && (gaunt.phase === 'TELL' || gaunt.phase === 'SWEEP');
    // The schedule is fixed and learnable: a porter who knows door 7 has a
    // GAUNT walks to the alcove on ROOM ENTRY, not when the tell fires.
    const gauntPrep = !!def.gaunt && !!gaunt && gaunt.phase === 'IDLE';

    let tx = laneX[def.archetype];
    let tz = 10;
    let want = false;
    let standStill = false;

    if ((gauntLive || gauntPrep) && def.gaunt) {
      const al = archetypeGeom(def.archetype).alcoves[def.gaunt.alcoveIndex];
      tx = (al.x0 + al.x1) / 2;
      tz = (al.z0 + al.z1) / 2;
      if (p.x >= al.x0 && p.x <= al.x1 && p.z >= al.z0 && p.z <= al.z1) standStill = true;
    } else if (cinder && cinder.phase === 'BLACKOUT' && def.cinderOrder) {
      const sc = sconcePositions(def)[def.cinderOrder[cinder.progress]];
      tx = sc.x;
      tz = sc.z;
      if (Math.hypot(p.x - sc.x, p.z - sc.z) < 1.1) want = true;
    } else if (s.oil < 0.45 && !s.oilCanUsed) {
      const can = archetypeGeom(def.archetype).oilCan;
      if (Math.hypot(p.x - can.x, p.z - can.z) < 6) {
        tx = can.x;
        tz = can.z;
        if (Math.hypot(p.x - can.x, p.z - can.z) < 1.1) want = true;
      }
    }

    if (!standStill) {
      // lane keeps the run clear of props mid-room; past them, converge on
      // the actual exit door centre so the interact range is reached.
      const ex = tz === 10 && p.z >= 8.2 ? 7 : tx;
      f.mx = clamp1((ex - p.x) * 1.5);
      f.mz = clamp1((tz - p.z) * 1.5);
    }
    if (!gauntLive && Math.hypot(p.x - 7, p.z - 10) <= 1.3) want = true;
    if (want && !prevWant) f.interact = true;
    prevWant = want;

    const fx = murmur ? murmur.x : tx;
    const fz = murmur ? murmur.z : tz;
    let d = Math.atan2(fx - p.x, fz - p.z) - p.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    f.yawD = d < -0.3 ? -0.3 : d > 0.3 ? 0.3 : d;
    return f;
  };
}

export function startLoop(deps: LoopDeps): LoopHandle {
  let sim = createInitialState(deps.seed);
  const autopilot = deps.autopilot ? createAutopilot() : null;
  const events: SimEvent[] = [];

  // T3 integration (handoff): the entity host keeps EntityGroup in sync with
  // the sim and owns the SimEvent -> audio dispatch; the graph arms its
  // AudioContext lazily on first user input (kiosk keypress resumes it).
  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audio = createAudioGraph();
  audio.arm();
  const entityHost = mountEntities(deps.scene.entityHost, { audio, reducedMotion });

  let acc = 0;
  let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let hudAt = 0;
  let frames = 0;
  let fpsAt = last;
  let fps = 0;
  let raf = 0;
  let stopped = false;
  let walkDist = 0; // footstep cadence: one thud per ~1.35 m walked

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function tick(): void {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const t = now();
    const dt = Math.min(0.25, (t - last) / 1000);
    last = t;

    frames++;
    if (t - fpsAt >= 1000) {
      fps = (frames * 1000) / (t - fpsAt);
      frames = 0;
      fpsAt = t;
    }

    if (!deps.isPaused()) {
      acc += dt;
      let steps = 0;
      while (acc >= DT && steps < MAX_CATCHUP_STEPS) {
        const frame = autopilot
          ? autopilot(sim)
          : deps.controller.readFrame(sim.player.yaw);
        if (frameHasInput(frame)) deps.onActivity?.();
        sim = stepSim(sim, frame);
        if (sim.events.length > 0) {
          for (const e of sim.events) events.push(e);
        }
        acc -= DT;
        steps++;
      }
      if (acc > DT * MAX_CATCHUP_STEPS) acc = 0; // drop the backlog, never spiral
    }

    const pitch = autopilot ? 0 : deps.controller.lookPitch;
    deps.scene.update(sim, events, t / 1000, pitch);
    entityHost.update(sim, events, t / 1000); // meshes + audio dispatch (T3)
    if (deps.onEvent) for (const e of events) deps.onEvent(e);
    events.length = 0;

    // footstep thuds on the door bus, cadence from walked distance
    if (sim.alive && !deps.isPaused()) {
      const speed = Math.hypot(sim.player.vel.x, sim.player.vel.z);
      walkDist += speed * dt;
      if (walkDist >= 1.35) {
        walkDist = 0;
        audio.footstep(0.3 + 0.4 * (speed / 2.2));
      }
    }

    if (t - hudAt >= 100) {
      hudAt = t;
      let tellKind: EntityKind | null = null;
      for (const e of sim.entities) {
        if (e.phase !== 'IDLE' && e.phase !== 'SURVIVED' && e.phase !== 'BANISHED') {
          tellKind = e.kind;
          break;
        }
      }
      deps.onHud({
        door: sim.door,
        doorLog: sim.doorLog,
        oil: sim.oil,
        alive: sim.alive,
        tellKind,
        interactPrompt: promptFor(sim),
        checkpoint: sim.checkpoint,
        deaths: sim.deaths,
        runMs: sim.runMs,
        deepest: sim.deepest,
      });
    }
    deps.onPhase(sim.finished ? 'run' : sim.alive ? 'playing' : 'dead');
  }

  raf = requestAnimationFrame(tick);
  return {
    stop(): void {
      stopped = true;
      cancelAnimationFrame(raf);
      entityHost.dispose();
      audio.dispose();
    },
    fps: () => fps,
    state: () => sim,
    reset(seed: number): void {
      sim = createInitialState(seed);
      acc = 0;
      walkDist = 0;
    },
    wakeAudio(): void {
      if (audio.ensure()) audio.startAmbience();
    },
  };
}
