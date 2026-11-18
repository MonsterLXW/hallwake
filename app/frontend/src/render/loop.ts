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
import { stareLooking } from '../core/entities';
import { perkChoices, xpLevel, type Difficulty, type PerkId } from '../core/progression';
import { minimapData, type MinimapData } from '../core/minimap';
import { buyOffer, isShopDoor, shopStock, type ShopSession } from '../core/shop';
import type { EntityKind, Frame, ItemType, SimEvent, SimState } from '../core/types';
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
  // Wave 1 kit surface (features.md): inventory strip, purse, lock/hidden state
  inv: ItemType[];
  coins: number;
  locked: boolean; // current exit is locked and the kit has no PICK
  pickOpens: boolean; // item art pass: exit is locked AND a PICK in the kit will open it
  hidden: boolean; // inside a closet
  // Wave 2: the view is inside STARE's cone right now (the LOOK AWAY plate)
  stareAt: boolean;
  // Wave 3 progression surface (features.md): XP, level, perks, difficulty
  xp: number;
  level: number;
  perks: PerkId[];
  perkPending: boolean; // a level-up pick is owed -> the overlay opens
  difficulty: Difficulty;
  // Wave 4 depth surface (features.md): the minimap plate data + the live
  // vendor screen (null while no keeper is blocking a threshold)
  minimap: MinimapData;
  shop: ShopSession | null;
}

export type RunPhase = 'playing' | 'dead' | 'run';

export interface LoopDeps {
  scene: SceneBundle;
  controller: PlayerController;
  seed: number;
  autopilot: boolean;
  difficulty: Difficulty; // Wave 3: attract-screen mode, threaded into the sim
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
  return (
    f.mx !== 0 ||
    f.mz !== 0 ||
    f.yawD !== 0 ||
    (f.pitchD !== undefined && f.pitchD !== 0) ||
    f.interact ||
    (f.use !== undefined && f.use >= 0)
  );
}

export interface LoopHandle {
  stop(): void;
  fps(): number;
  state(): SimState;
  /** Kiosk reset: fresh sim at door 1 with a new run id, scene untouched. */
  reset(seed: number, difficulty: Difficulty): void;
  /** Wave 3: the perk overlay's choice, applied on the next sim tick. */
  choosePerk(p: PerkId): void;
  /** Wave 4: buy offer index i from the open vendor screen (pure buyOffer on
      the sim; refused silently if the purse is light or the pack is full). */
  buyShop(i: number): void;
  /** Wave 4: step past the keeper; the corridor resumes. */
  closeShop(): void;
  /** Gamepad begins never fire key/pointer listeners: wake the graph here. */
  wakeAudio(): void;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

// The interact prompt is derived from sim state only (the HUD never guesses):
// exit door in range -> OPEN nn (or the LOCKED tell), closet -> HIDE /
// EXIT CLOSET, loot pile -> TAKE <item>, coin pile -> COINS, blackout sconce
// in range -> RELIGHT, unused oil can in range -> OIL CAN, FLASK in kit with
// nothing else in range -> FLASK +OIL.
function promptFor(sim: SimState): string | null {
  if (!sim.alive || sim.finished) return null;
  const def = doorDef(sim.door);
  const p = sim.player;
  if (sim.door < 24 && Math.hypot(p.x - EXIT_DOOR.x, p.z - EXIT_DOOR.z) <= INTERACT_RANGE) {
    if (def.locked && !sim.inv.includes('PICK')) return 'LOCKED — need a Pick';
    return `OPEN ${pad2(sim.doorLog)}`;
  }
  if (sim.hidden) return 'EXIT CLOSET';
  const geom = archetypeGeom(def.archetype);
  if (def.loot && !sim.lootTaken && Math.hypot(p.x - geom.loot.x, p.z - geom.loot.z) <= INTERACT_RANGE) {
    return sim.inv.length < 4 ? `TAKE ${def.loot}` : 'PACK FULL';
  }
  if (def.coins && !sim.coinsTaken && Math.hypot(p.x - geom.coins.x, p.z - geom.coins.z) <= INTERACT_RANGE) {
    return 'COINS';
  }
  // Wave 4: the hidden alcove's marked sconce — the prompt invites the
  // lantern sweep that finds it; a full pack refuses the visit.
  if (def.secret && !sim.secretFound && Math.hypot(p.x - def.secret.x, p.z - def.secret.z) <= INTERACT_RANGE) {
    return sim.inv.length < 4 ? 'ODD SCONCE' : 'PACK FULL';
  }
  if (def.closet) {
    const cc = { x: (def.closet.x0 + def.closet.x1) / 2, z: (def.closet.z0 + def.closet.z1) / 2 };
    if (Math.hypot(p.x - cc.x, p.z - cc.z) <= INTERACT_RANGE) return 'HIDE';
  }
  const cinder = sim.entities.find((e) => e.kind === 'CINDER');
  if (cinder && cinder.phase === 'BLACKOUT' && def.cinderOrder) {
    for (const sc of sconcePositions(def)) {
      if (Math.hypot(p.x - sc.x, p.z - sc.z) <= INTERACT_RANGE) return 'RELIGHT';
    }
  }
  if (!sim.oilCanUsed) {
    const can = geom.oilCan;
    if (Math.hypot(p.x - can.x, p.z - can.z) <= INTERACT_RANGE) return 'OIL CAN';
  }
  if (sim.inv.includes('FLASK')) return 'FLASK +OIL';
  return null;
}

const clamp1 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

// Deterministic scripted player: walks the corridor lane for each archetype,
// opens real doors, relights CINDER sconces in the door's scratch order,
// hides in the alcove during a GAUNT sweep, keeps the beam on MURMUR.
// Wave 2 additions: on a STARE door it keeps its view pointed AWAY from the
// eye (movement is lane-based, so looking away costs nothing); on a GRIP
// door it sprints the lane straight to the exit and pays the loot piles no
// mind — the porter who knows the schedule outruns a 1.6 m/s chase.
export function createAutopilot(): (s: SimState) => Frame {
  const f: Frame = { mx: 0, mz: 0, yawD: 0, pitchD: 0, interact: false };
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
    f.pitchD = 0;
    f.interact = false;
    // Wave 3: a porter who knows the schedule also claims every perk pick
    // instantly — always the first offered choice, so the run is identical
    // every time (no RNG anywhere, overlay included).
    f.perk = xpLevel(s.xp) > s.perks.length ? perkChoices(s.perks)[0] : undefined;
    if (!s.alive || s.finished) return f;

    const def = doorDef(s.door);
    const p = s.player;
    const gaunt = s.entities.find((e) => e.kind === 'GAUNT');
    const cinder = s.entities.find((e) => e.kind === 'CINDER');
    const murmur = s.entities.find((e) => e.kind === 'MURMUR');
    const stare = s.entities.find((e) => e.kind === 'STARE');
    const grip = s.entities.find((e) => e.kind === 'GRIP');
    const gauntLive = !!gaunt && (gaunt.phase === 'TELL' || gaunt.phase === 'SWEEP');
    const stareLive = !!stare && (stare.phase === 'TELL' || stare.phase === 'ACTIVE');
    const gripLive = !!grip && grip.phase !== 'BANISHED';
    // The schedule is fixed and learnable: a porter who knows door 7 has a
    // GAUNT walks to the alcove on ROOM ENTRY, not when the tell fires.
    const gauntPrep = !!def.gaunt && !!gaunt && gaunt.phase === 'IDLE';

    let tx = laneX[def.archetype];
    let tz = 10;
    let want = false;
    let standStill = false;

    if (gripLive) {
      // GRIP: default routing (lane toward the exit) IS the counterplay —
      // skip every loot/oil detour while it is on the floor with you.
    } else if ((gauntLive || gauntPrep) && def.gaunt) {
      const al = archetypeGeom(def.archetype).alcoves[def.gaunt.alcoveIndex];
      tx = (al.x0 + al.x1) / 2;
      tz = (al.z0 + al.z1) / 2;
      if (p.x >= al.x0 && p.x <= al.x1 && p.z >= al.z0 && p.z <= al.z1) standStill = true;
    } else if (def.locked && !s.inv.includes('PICK') && def.loot === 'PICK' && !s.lootTaken) {
      // Wave 1: a locked exit with the PICK authored in this room — a porter
      // who knows the schedule grabs the pick before ever touching the door.
      const lt = archetypeGeom(def.archetype).loot;
      tx = lt.x;
      tz = lt.z;
      if (Math.hypot(p.x - lt.x, p.z - lt.z) < 1.1) want = true;
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

    // View: STARE doors face AWAY from the eye (the cone check is yaw+pitch;
    // facing the opposite bearing keeps the dot at -1). MURMUR doors keep
    // the beam on it. Everywhere else, face the travel target.
    let fx: number;
    let fz: number;
    let faceAway = false;
    if (stareLive && stare) {
      fx = stare.x;
      fz = stare.z;
      faceAway = true;
    } else if (murmur) {
      fx = murmur.x;
      fz = murmur.z;
    } else {
      fx = tx;
      fz = tz;
    }
    let d = Math.atan2(fx - p.x, fz - p.z) - p.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (faceAway) {
      d += Math.PI;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
    }
    f.yawD = d < -0.3 ? -0.3 : d > 0.3 ? 0.3 : d;
    return f;
  };
}

export function startLoop(deps: LoopDeps): LoopHandle {
  let sim = createInitialState(deps.seed, deps.difficulty);
  const autopilot = deps.autopilot ? createAutopilot() : null;
  const events: SimEvent[] = [];
  let queuedPerk: PerkId | null = null; // Wave 3: overlay choice awaiting the next tick
  // Wave 4: the threshold keeper's screen. Opened when a human porter walks
  // through door 8/16/24; the corridor waits (like the perk plate) until the
  // screen closes. The autopilot never owes a visit — it banks no coins.
  let shopSession: ShopSession | null = null;

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

    // Wave 3: while a level-up pick is owed, the corridor waits — the sim
    // freezes (no drain, no entity steps) until the overlay sends a choice
    // through choosePerk(). The autopilot never owes a pick: it answers
    // inline on its own frame.
    const perkPending =
      !deps.autopilot && sim.alive && !sim.finished && xpLevel(sim.xp) > sim.perks.length;
    const corridorFrozen = perkPending && queuedPerk === null;
    const shopFrozen = shopSession !== null;

    if (!deps.isPaused()) {
      if (corridorFrozen) {
        acc = 0;
      } else if (perkPending && queuedPerk !== null) {
        const p = queuedPerk;
        queuedPerk = null;
        deps.controller.clearEdges(); // the number keys that chose the perk must not also drink the kit
        sim = stepSim(sim, { mx: 0, mz: 0, yawD: 0, pitchD: 0, interact: false, perk: p });
        if (sim.events.length > 0) {
          for (const e of sim.events) events.push(e);
        }
        acc = 0;
      } else if (shopFrozen) {
        acc = 0; // Wave 4: MOTT counts the purse; the corridor waits
      } else {
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
        // Wave 4: walking through a keeper's threshold (8/16/24) opens the
        // vendor screen; the next frame holds the corridor still.
        if (!deps.autopilot && shopSession === null) {
          for (const e of events) {
            if (e.type === 'door_open' && isShopDoor(e.door)) {
              shopSession = { door: e.door, sold: [] };
              break;
            }
          }
        }
      }
    }

    // Wave 2: the sim owns the view (STARE reads yaw AND pitch), so the
    // camera pitch comes straight from sim state — autopilot included.
    deps.scene.update(sim, events, t / 1000, sim.player.pitch);
    entityHost.update(sim, events, t / 1000); // meshes + audio dispatch (T3)
    if (deps.onEvent) for (const e of events) deps.onEvent(e);
    events.length = 0;

    // footstep thuds on the door bus, cadence from walked distance
    if (sim.alive && !deps.isPaused() && !corridorFrozen && !shopFrozen) {
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
        if (e.phase !== 'IDLE' && e.phase !== 'SURVIVED' && e.phase !== 'BANISHED' && e.phase !== 'DEPARTED') {
          tellKind = e.kind;
          break;
        }
      }
      const stare = sim.entities.find((e) => e.kind === 'STARE');
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
        inv: [...sim.inv],
        coins: sim.coins,
        locked: doorDef(sim.door).locked === true && !sim.inv.includes('PICK'),
        pickOpens: doorDef(sim.door).locked === true && sim.inv.includes('PICK'),
        hidden: sim.hidden,
        stareAt: !!stare && stare.phase === 'ACTIVE' && stareLooking(stare, sim.player),
        xp: sim.xp,
        level: xpLevel(sim.xp),
        perks: [...sim.perks],
        perkPending: sim.alive && !sim.finished && xpLevel(sim.xp) > sim.perks.length,
        difficulty: sim.difficulty,
        minimap: minimapData(sim),
        shop: shopSession ? { door: shopSession.door, sold: [...shopSession.sold] } : null,
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
    reset(seed: number, difficulty: Difficulty): void {
      sim = createInitialState(seed, difficulty);
      queuedPerk = null;
      shopSession = null;
      acc = 0;
      walkDist = 0;
    },
    choosePerk(p: PerkId): void {
      queuedPerk = p;
    },
    buyShop(i: number): void {
      if (!shopSession) return;
      if (shopSession.sold.includes(i)) return;
      const offer = shopStock(shopSession.door)[i];
      if (!offer) return;
      const next = buyOffer(sim, offer);
      if (next === null) return; // purse too light / pack full — the screen says why
      sim = next;
      shopSession = { ...shopSession, sold: [...shopSession.sold, i] };
      events.push({ type: 'shop', item: offer.item, door: shopSession.door, visible: true });
      deps.controller.clearEdges(); // the number keys that bought must not also drink the kit
    },
    closeShop(): void {
      if (!shopSession) return;
      shopSession = null;
      deps.controller.clearEdges();
    },
    wakeAudio(): void {
      if (audio.ensure()) audio.startAmbience();
    },
  };
}
