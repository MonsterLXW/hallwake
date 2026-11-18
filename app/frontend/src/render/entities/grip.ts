// HALLWAKE — GRIP (features.md Wave 2, design-brief §3). A hunched,
// long-knuckled brute that drags itself down the corridor: squat torso,
// tucked head, arms that reach too far, and a bruise-lilac mark across the
// chest that reads as its "face". It carries no light. FSM phases honoured
// exactly: HUNT (lurching advance — deterministic sway, steady under
// reduced motion), FROZEN (a lit sconce holds it: dead still, mark brighter
// — the counterplay made visible), BANISHED (WARD terminal: gone).

import * as THREE from 'three';
import type { GripState } from '../../core/types';
import { DEFAULT_CTX, TOKEN, tokenColor, type EntityCtx, type EntityVisual } from './fx';

const SILHOUETTE = 0x23232a; // squat dark mass, a shade lighter than GAUNT's
const LURCH_HZ = 5.2; // one lurch per ~1.2 s of advance

export function buildGrip(): EntityVisual<GripState> {
  const group = new THREE.Group();
  group.visible = false;

  const bodyMat = new THREE.MeshBasicMaterial({ color: SILHOUETTE, transparent: true });
  const markMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(tokenColor('--signal-grip', TOKEN.grip)),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const aoMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.7), bodyMat);
  torso.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.42), bodyMat);
  head.position.set(0, 1.28, 0.26); // tucked forward, never upright
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1.0, 3, 6), bodyMat);
  armL.position.set(-0.62, 0.72, 0.1);
  armL.rotation.z = 0.22; // knuckles drag
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1.0, 3, 6), bodyMat);
  armR.position.set(0.62, 0.72, 0.1);
  armR.rotation.z = -0.22;
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), markMat);
  mark.position.set(0, 0.95, 0.36); // the bruise across its chest faces you
  const ao = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10).rotateX(-Math.PI / 2), aoMat);
  ao.position.y = 0.02;

  group.add(torso, head, armL, armR, mark, ao);

  function update(state: GripState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    if (state.phase === 'BANISHED') {
      group.visible = false;
      return;
    }
    group.visible = true;

    const frozen = state.phase === 'FROZEN';
    // HUNT: a deterministic lurch (no RNG). Reduced motion parks it at the
    // lurch's steady midpoint — the shape and the mark read identically.
    const lurch = frozen || ctx.reducedMotion ? 0 : Math.abs(Math.sin(t * LURCH_HZ)) * 0.07;
    torso.position.y = 0.78 + lurch;
    head.position.y = 1.28 + lurch * 1.4;
    armL.position.y = 0.72 + lurch * 0.6;
    armR.position.y = 0.72 + lurch * 0.6;

    // the sconce-light hold made visible: dead still, mark burning brighter
    markMat.opacity = frozen ? 0.95 : 0.55;

    const dx = ctx.playerX - state.x;
    const dz = ctx.playerZ - state.z;
    if (dx !== 0 || dz !== 0) group.rotation.y = Math.atan2(dx, dz);
  }

  function dispose(): void {
    for (const m of [torso, head, armL, armR, mark, ao]) m.geometry.dispose();
    bodyMat.dispose();
    markMat.dispose();
    aoMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 6, update, dispose };
}
