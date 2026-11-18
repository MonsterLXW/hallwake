// HALLWAKE — the Three.js scene (architecture.md §3). Thin consumer of
// SimState: it never mutates sim state. One lantern SpotLight, at most two
// event PointLights, zero shadow maps, exponential fog at the token black.
// Only the current room + preloaded next room are alive. All colors come
// from identity tokens at runtime (tokens.css is the single source).

import * as THREE from 'three';
import type { SimEvent, SimState } from '../core/types';
import { lanternRadius } from '../core/oil';
import { LANTERN_PERK_BONUS } from '../core/progression';
import { doorDef } from '../core/schedule';
import { QUALITY, type Quality } from './quality';
import {
  buildRoomGroup,
  createSharedMaterials,
  disposeRoomGroup,
  roomPlanFor,
  type RoomMeshes,
  type SharedMaterials,
} from './roomBuilder';

function tokenColor(name: string, fallback: string): number {
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return parseInt(v.replace('#', ''), 16);
    } catch {
      /* fall through to the mirrored value */
    }
  }
  return parseInt(fallback.slice(1), 16);
}

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  entityHost: THREE.Group; // T3 mounts entity meshes here
  update(sim: SimState, events: SimEvent[], nowSec: number, pitch?: number): void;
  resize(): void;
  dispose(): void;
}

const EYE = 1.6;

export function createScene(canvas: HTMLCanvasElement, quality: Quality): SceneBundle {
  const preset = QUALITY[quality];
  const cBg = tokenColor('--color-bg', '#0A0A0E');
  const cBone = tokenColor('--color-ink', '#EDE7DA');
  const cWarm = tokenColor('--oil-high', '#E3D7BC');
  const cGaunt = tokenColor('--signal-gaunt', '#F2A63C');
  const cTally = tokenColor('--signal-tally', '#D6574C');
  const cCinder = tokenColor('--signal-cinder', '#58B4E8');
  const cStare = tokenColor('--signal-stare', '#8FE3C8');

  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = false; // never, at any quality
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1.5));
  renderer.setClearColor(cBg, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(cBg, preset.fogDensity);

  // Ambient fill: a bone wash so walls/props read clearly outside the
  // lantern cone — the near room and its exits must be plainly navigable
  // (the corridor's far end stays dark via fog, not via black walls). The
  // lantern still carves the focal pool of light and owns the tells.
  const ambient = new THREE.AmbientLight(cBone, 0.6);
  scene.add(ambient);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 32);
  camera.rotation.order = 'YXZ'; // yaw then pitch, FPS-style (no roll when looking up)
  scene.add(camera);

  // --- the single dynamic lantern -----------------------------------------
  const lantern = new THREE.SpotLight(cWarm, 3.0, 8, 1.25, 0.6, 1.0);
  lantern.position.set(0, -0.1, 0);
  lantern.target.position.set(0, -0.15, -1);
  camera.add(lantern);
  camera.add(lantern.target);

  // --- pooled event lights (<= 2, only while an event is live) -------------
  const eventLights: { light: THREE.PointLight; until: number }[] = [];
  for (let i = 0; i < preset.eventLights; i++) {
    const light = new THREE.PointLight(cBone, 0, 9, 2);
    light.visible = false;
    scene.add(light);
    eventLights.push({ light, until: 0 });
  }

  // --- rooms ---------------------------------------------------------------
  const mats: SharedMaterials = createSharedMaterials(quality);
  let currentDoor = 0;
  let rooms: RoomMeshes[] = [];
  const entityHost = new THREE.Group();
  scene.add(entityHost);

  function rebuildRooms(door: number): void {
    for (const r of rooms) disposeRoomGroup(r);
    rooms = [];
    const cur = buildRoomGroup(roomPlanFor(doorDef(door)), quality, mats);
    cur.group.position.z = 0;
    scene.add(cur.group);
    rooms.push(cur);
    if (door < 24) {
      const next = buildRoomGroup(roomPlanFor(doorDef(door + 1)), quality, mats);
      next.group.position.z = 10; // preloaded corridor continuation
      scene.add(next.group);
      rooms.push(next);
    }
    currentDoor = door;
  }

  // --- scratch (no per-frame allocations) ----------------------------------
  const scratchColor = new THREE.Color();
  const litColor = new THREE.Color();
  const dimColor = new THREE.Color();
  const cinderColor = new THREE.Color(cCinder);
  const offColor = new THREE.Color(0x050507);
  const secretColor = new THREE.Color(tokenColor('--color-ink', '#EDE7DA')); // Wave 4: cold bone — an odd, unlit flame
  const scratchDummy = new THREE.Object3D();

  let bobPhase = 0;
  let lastNow = 0;
  let gauntFlickerUntil = 0;
  let tallyGlowUntil = 0;

  function update(sim: SimState, events: SimEvent[], nowSec: number, pitch = 0): void {
    const dt = Math.min(0.1, nowSec - lastNow || 0);
    lastNow = nowSec;

    if (sim.door !== currentDoor) rebuildRooms(sim.door);

    // transient tells from the event channel (flicker is information, §7)
    for (const e of events) {
      if (e.type === 'tell' && e.visible) {
        if (e.entity === 'GAUNT') gauntFlickerUntil = nowSec + 0.36; // two 180ms blinks
        if (e.entity === 'TALLY') tallyGlowUntil = nowSec + 1.0; // one red beat
        if (e.entity === 'CINDER' || e.entity === 'GAUNT' || e.entity === 'STARE') {
          const slot = eventLights.find((s) => s.until <= nowSec) ?? eventLights[0];
          slot.light.visible = true;
          slot.light.color.set(e.entity === 'CINDER' ? cCinder : e.entity === 'GAUNT' ? cGaunt : cStare);
          slot.light.position.set(sim.player.x, 2.2, sim.player.z + 2.5);
          slot.until = nowSec + 2.0;
        }
      }
    }

    // --- camera rig + walk bob ---------------------------------------------
    const speed = Math.hypot(sim.player.vel.x, sim.player.vel.z);
    bobPhase += speed * dt * 4.2;
    const bob = reducedMotion ? 0 : Math.sin(bobPhase) * 0.045 * (speed / 2.2);
    camera.position.set(sim.player.x, EYE + bob, sim.player.z);
    camera.rotation.set(pitch, sim.player.yaw + Math.PI, 0); // YXZ: yaw then pitch (lantern is a camera child, so the beam tilts with the view)

    // --- lantern: radius is oil, color/flicker is the tell channel ----------
    const gaunt = sim.entities.find((e) => e.kind === 'GAUNT');
    const murmur = sim.entities.find((e) => e.kind === 'MURMUR');
    const cinder = sim.entities.find((e) => e.kind === 'CINDER');
    const stare = sim.entities.find((e) => e.kind === 'STARE');
    const gauntLive = !!gaunt && (gaunt.phase === 'TELL' || gaunt.phase === 'SWEEP');
    const cinderLive = !!cinder && (cinder.phase === 'TELL' || cinder.phase === 'BLACKOUT');
    const stareLive = !!stare && (stare.phase === 'TELL' || stare.phase === 'ACTIVE');

    // Wave 3: BRIGHT_LANTERN perk throws the beam 1.5 m farther.
    const lanternBonus = sim.perks.includes('BRIGHT_LANTERN') ? LANTERN_PERK_BONUS : 0;
    lantern.distance = lanternRadius(sim.oil, lanternBonus) * preset.lanternScale;
    let intensity = 2.6 + 1.8 * sim.oil;
    scratchColor.set(cWarm);
    if (gauntLive) {
      scratchColor.set(cGaunt); // sodium amber: GAUNT owns amber (brief §3)
      if (!reducedMotion && nowSec < gauntFlickerUntil) {
        const blink = Math.floor((nowSec * 1000 - (gauntFlickerUntil - 360)) / 180);
        intensity *= blink % 2 === 0 ? 0.25 : 1.0;
      }
    } else if (cinderLive) {
      scratchColor.lerp(cinderColor, 0.45); // spectral blue wash
    } else if (stareLive) {
      scratchColor.set(cStare); // Wave 2: spectral jade — STARE owns it, steady (fair)
    }
    if (murmur && murmur.phase === 'HUNT' && murmur.dist < 5) {
      // MURMUR is hueless by design: its channel is luminance only — the
      // beam sputters dim, it never wears a signal hue.
      intensity *= reducedMotion ? 0.8 : 0.82 + 0.18 * Math.sin(nowSec * 23);
    }
    lantern.intensity = intensity;
    lantern.color.copy(scratchColor);

    // --- sconces: emissive instances, never lights --------------------------
    const room = rooms[0];
    if (room) {
      litColor.set(cinderLive ? cCinder : cWarm);
      dimColor.set(cBone).multiplyScalar(0.5);
      for (let i = 0; i < room.sconceInst.count; i++) {
        if (i === room.secretIndex) continue; // the secret sconce has its own state
        const lit = sim.sconces[i];
        room.sconceInst.setColorAt(i, lit ? (cinderLive ? cinderColor : litColor) : offColor);
      }
      // 3D item pass: the loot pile is a real merged silhouette mesh — it
      // stands while the pile is there, gone once taken. A slow constant
      // spin + hover bob (pure time math, never RNG) sells the third
      // dimension from any angle; reduced motion parks it upright.
      if (room.lootMesh) {
        const def = doorDef(sim.door);
        const show = !!def.loot && !sim.lootTaken;
        room.lootMesh.visible = show;
        if (show) {
          if (reducedMotion) {
            room.lootMesh.rotation.y = 0;
            room.lootMesh.position.y = 0.03;
          } else {
            room.lootMesh.rotation.y = nowSec * 0.9;
            room.lootMesh.position.y = 0.03 + Math.sin(nowSec * 1.7) * 0.025;
          }
        }
      }
      // Wave 4: the hidden alcove's sconce — a cold bone flame among the warm
      // ones while the nook is unopened; dark once the porter found it.
      if (room.secretIndex >= 0) {
        const def = doorDef(sim.door);
        const avail = !!def.secret && !sim.secretFound;
        room.sconceInst.setColorAt(room.secretIndex, avail ? secretColor : offColor);
      }
      if (room.sconceInst.instanceColor) room.sconceInst.instanceColor.needsUpdate = true;

      // Wave 1: closet panel — sealed across the nook while hidden (the
      // narrow slit is the view), stowed to nothing while open.
      if (room.closetPanel && room.closetQuad) {
        const q = room.closetQuad;
        const k = sim.hidden ? 1 : 0.001;
        scratchDummy.position.set(q.x, q.y, q.z);
        scratchDummy.rotation.set(0, q.rotY, 0);
        scratchDummy.scale.set(q.w * k, q.h * k, 1);
        scratchDummy.updateMatrix();
        room.closetPanel.setMatrixAt(0, scratchDummy.matrix);
        room.closetPanel.instanceMatrix.needsUpdate = true;
      }

      // --- door numeral tint + TALLY fake door ------------------------------
      const tally = sim.entities.find((e) => e.kind === 'TALLY');
      const tallyTell = !!tally && (tally.phase === 'TELL' || nowSec < tallyGlowUntil);
      room.doorMat.color.set(tallyTell ? cTally : cBone);
      if (room.fakeDoorMesh) room.fakeDoorMesh.visible = !!tally && tally.phase === 'FAKE';
    }

    // --- event light decay ---------------------------------------------------
    for (const slot of eventLights) {
      if (slot.until > nowSec) {
        slot.light.intensity = 2.4 * ((slot.until - nowSec) / 2.0);
      } else if (slot.light.intensity !== 0) {
        slot.light.intensity = 0;
        slot.light.visible = false;
      }
    }

    renderer.render(scene, camera);
  }

  function resize(): void {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    for (const r of rooms) disposeRoomGroup(r);
    rooms = [];
    staticDispose(mats);
    for (const slot of eventLights) slot.light.dispose();
    lantern.dispose();
    renderer.dispose();
  }

  resize();
  rebuildRooms(1);
  return { scene, camera, entityHost, update, resize, dispose };
}

function staticDispose(mats: SharedMaterials): void {
  mats.staticMat.dispose();
  mats.propsMat.dispose();
  mats.sconceMat.dispose();
  mats.alcoveMat.dispose();
  mats.closetMat.dispose();
  mats.aoMat.dispose();
  mats.pileMat.dispose();
}
