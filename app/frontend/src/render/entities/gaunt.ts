// HALLWAKE — GAUNT (architecture.md §5, design-brief §3). A too-tall
// stitched silhouette: elongated capsule body, small head, long arms, and a
// suture seam that burns sodium-amber while the tell/sweep is live. It never
// carries a light — the amber comes from the scene's lantern/event pool;
// this mesh only tints its own seam so the shape reads against lit walls.
// FSM phases honoured exactly: IDLE (not yet manifest), TELL (appears at
// the waypoint start, seam blinks then steadies amber), SWEEP (walks the
// schedule path), SURVIVED (fades out — the corridor lets you keep breathing).

import * as THREE from 'three';
import type { GauntState } from '../../core/types';
import {
  DEFAULT_CTX,
  flickerEnvelope,
  getStitchTexture,
  TOKEN,
  tokenColor,
  type EntityCtx,
  type EntityVisual,
} from './fx';

const SILHOUETTE = 0x26262c; // dark figure against lantern-lit plaster
const FADE_SEC = 0.6;

export function buildGaunt(): EntityVisual<GauntState> {
  const group = new THREE.Group();
  group.visible = false;

  const bodyMat = new THREE.MeshBasicMaterial({ color: SILHOUETTE, transparent: true });
  const seamMat = new THREE.MeshBasicMaterial({
    map: getStitchTexture(),
    transparent: true,
    color: new THREE.Color(TOKEN.boneDim),
    depthWrite: false,
  });
  const aoMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.7, 4, 8), bodyMat);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), bodyMat);
  head.position.y = 2.52;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.15, 3, 6), bodyMat);
  armL.position.set(-0.3, 1.55, 0);
  armL.rotation.z = 0.12;
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.15, 3, 6), bodyMat);
  armR.position.set(0.3, 1.55, 0);
  armR.rotation.z = -0.12;
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.2), seamMat);
  seam.position.set(0, 1.4, 0.28);
  const ao = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10).rotateX(-Math.PI / 2), aoMat);
  ao.position.y = 0.02;

  group.add(body, head, armL, armR, seam, ao);

  const idleBody = new THREE.Color(SILHOUETTE);
  const amber = new THREE.Color(tokenColor('--signal-gaunt', TOKEN.gaunt));
  const bone = new THREE.Color(TOKEN.boneDim);
  const sweepBody = idleBody.clone().lerp(amber, 0.22);

  let lastPhase = 'IDLE';
  let survivedAt = -1;

  function update(state: GauntState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    if (state.phase !== lastPhase) {
      if (state.phase === 'SURVIVED') survivedAt = t;
      lastPhase = state.phase;
    }

    if (state.phase === 'IDLE') {
      group.visible = false;
      return;
    }
    if (state.phase === 'SURVIVED') {
      const e = survivedAt < 0 ? 1 : Math.min(1, (t - survivedAt) / FADE_SEC);
      seamMat.opacity = Math.max(0, 1 - e);
      bodyMat.opacity = Math.max(0, 1 - e);
      aoMat.opacity = 0.5 * Math.max(0, 1 - e);
      group.visible = e < 1;
      group.scale.setScalar(1 - 0.25 * e);
      return;
    }

    // TELL / SWEEP: manifest, facing the player
    group.visible = true;
    group.scale.setScalar(1);
    bodyMat.opacity = 1;
    aoMat.opacity = 0.5;

    seamMat.color.copy(amber);
    const env = flickerEnvelope(t, ctx.tellStart ?? t, ctx.reducedMotion);
    seamMat.opacity = 0.35 + 0.65 * env;
    bodyMat.color.copy(state.phase === 'SWEEP' ? sweepBody : idleBody);

    const dx = ctx.playerX - state.x;
    const dz = ctx.playerZ - state.z;
    if (dx !== 0 || dz !== 0) group.rotation.y = Math.atan2(dx, dz);
  }

  function dispose(): void {
    for (const m of [body, head, armL, armR, seam, ao]) m.geometry.dispose();
    bodyMat.dispose();
    seamMat.dispose();
    aoMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 6, update, dispose };
}
