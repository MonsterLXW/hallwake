// HALLWAKE — STARE (features.md Wave 2, design-brief §3). A floating eye
// silhouette: bone sclera, spectral-jade iris, slit pupil, hooded by a dark
// shroud so it reads as a watcher, not a lamp. It carries no light — the
// jade wash comes from the scene's lantern/event pool via tellLightState.
// FSM phases honoured exactly: IDLE (not manifest), TELL (chime fired — the
// eye hangs there, glow steady, the look-check has NOT opened yet), ACTIVE
// (the stare meter: the glow tightens as the grace burns down — a readable
// countdown, identical under reduced motion), DEPARTED (fades out, survived),
// BANISHED (WARD terminal: gone).

import * as THREE from 'three';
import { STARE_GRACE_TICKS } from '../../core/entities';
import type { StareState } from '../../core/types';
import { DEFAULT_CTX, getEyeTexture, TOKEN, tokenColor, type EntityCtx, type EntityVisual } from './fx';

const SHROUD = 0x1c1c24; // darker than GAUNT: the eye is a hole, not a body
const FADE_SEC = 0.6;
const EYE_Y = 1.7; // mirrors core STARE_EYE_Y so the mesh sits where the cone points

export function buildStare(): EntityVisual<StareState> {
  const group = new THREE.Group();
  group.visible = false;

  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(tokenColor('--signal-stare', TOKEN.stare)),
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), glowMat);
  glow.position.y = EYE_Y;

  const eyeMat = new THREE.MeshBasicMaterial({
    map: getEyeTexture(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide, // flat quad: readable from any side the player turns
  });
  const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), eyeMat);
  eye.position.y = EYE_Y;

  const shroudMat = new THREE.MeshBasicMaterial({ color: SHROUD, transparent: true, opacity: 0.92 });
  const shroud = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 6), shroudMat);
  shroud.position.y = EYE_Y - 0.72; // tattered drape hanging below the eye
  shroud.rotation.x = Math.PI; // point down

  group.add(glow, eye, shroud);

  let lastPhase = 'IDLE';
  let departedAt = -1;

  function update(state: StareState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    if (state.phase !== lastPhase) {
      if (state.phase === 'DEPARTED') departedAt = t;
      lastPhase = state.phase;
    }

    if (state.phase === 'IDLE' || state.phase === 'BANISHED') {
      group.visible = false;
      return;
    }
    if (state.phase === 'DEPARTED') {
      const e = departedAt < 0 ? 1 : Math.min(1, (t - departedAt) / FADE_SEC);
      eyeMat.opacity = 0.9 * Math.max(0, 1 - e);
      glowMat.opacity = 0.14 * Math.max(0, 1 - e);
      shroudMat.opacity = 0.92 * Math.max(0, 1 - e);
      group.visible = e < 1;
      group.scale.setScalar(1 - 0.2 * e);
      return;
    }

    // TELL / ACTIVE: manifest at the authored point, always facing the player
    group.visible = true;
    group.scale.setScalar(1);
    shroudMat.opacity = 0.92;
    eyeMat.opacity = state.phase === 'TELL' ? 0.75 : 0.95;

    // the stare meter: glow tightens as consecutive-looking ticks burn the
    // grace down. Steady states only — no flicker — so reduced motion reads
    // the identical danger gradient (brief §7 fairness).
    const heat = Math.min(1, state.stareTicks / STARE_GRACE_TICKS);
    glowMat.opacity = 0.14 + 0.4 * heat;
    glow.scale.setScalar(1 + 0.35 * heat);

    const dx = ctx.playerX - state.x;
    const dz = ctx.playerZ - state.z;
    if (dx !== 0 || dz !== 0) group.rotation.y = Math.atan2(dx, dz);
  }

  function dispose(): void {
    for (const m of [glow, eye, shroud]) m.geometry.dispose();
    glowMat.dispose();
    eyeMat.dispose();
    shroudMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 3, update, dispose };
}
