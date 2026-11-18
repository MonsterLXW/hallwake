// HALLWAKE — TALLY (architecture.md §5, design-brief §3). Chalk marks on
// the door frame plus a duplicate door whose stenciled numeral is the
// expected number + 2 — a mouth wearing a door. The chalk overlay and the
// one-beat red glow are the tell; the fake door only exists in FAKE phase.
// Counterplay stays honest: the numeral is the door log's number + 2, so a
// porter who reads the HUD log can tell real from mouth at a glance.

import * as THREE from 'three';
import type { TallyState } from '../../core/types';
import { getNumeralTexture } from '../textures';
import { DEFAULT_CTX, getChalkTexture, numeralBeat, TOKEN, tokenColor, type EntityCtx, type EntityVisual } from './fx';

export function buildTally(fakeNum: number): EntityVisual<TallyState> {
  const group = new THREE.Group();

  const chalkMat = new THREE.MeshBasicMaterial({
    map: getChalkTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), chalkMat);
  chalk.position.set(-1.05, 1.5, 0.02);
  chalk.rotation.y = Math.PI; // face the room interior, like the door quad

  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(tokenColor('--signal-tally', TOKEN.tally)),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), glowMat);
  glow.position.set(-1.05, 1.5, 0.01);
  glow.rotation.y = Math.PI;

  // fakeDoor + jambs are a freestanding door, not a wall decal: DoubleSide so
  // the mouth-door stays legible from any angle the player circles it at.
  const fakeMat = new THREE.MeshBasicMaterial({ map: getNumeralTexture(fakeNum), side: THREE.DoubleSide });
  const fakeDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), fakeMat);
  fakeDoor.position.set(3.5, 1.05, -0.18); // FAKE_DOOR_POS, room-local
  fakeDoor.rotation.y = Math.PI;

  const jambMat = new THREE.MeshBasicMaterial({ color: 0x3C3C4A, side: THREE.DoubleSide }); // rule-strong
  const jambL = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.24), jambMat);
  jambL.position.set(3.5 - 0.78, 1.05, -0.17);
  jambL.rotation.y = Math.PI;
  const jambR = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.24), jambMat);
  jambR.position.set(3.5 + 0.78, 1.05, -0.17);
  jambR.rotation.y = Math.PI;

  chalk.visible = false;
  glow.visible = false;
  fakeDoor.visible = false;
  jambL.visible = false;
  jambR.visible = false;
  group.add(chalk, glow, fakeDoor, jambL, jambR);

  let lastPhase = 'IDLE';
  let tellAt = -1;

  function update(state: TallyState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    if (state.phase !== lastPhase) {
      if (state.phase === 'TELL') tellAt = ctx.tellStart ?? t;
      lastPhase = state.phase;
    }

    if (state.phase === 'IDLE') {
      chalk.visible = false;
      glow.visible = false;
      fakeDoor.visible = false;
      jambL.visible = false;
      jambR.visible = false;
      return;
    }

    // TELL: chalk appears, one steady 1 s red beat (brief §7 — the beat is
    // a counterplay window, so reduced motion keeps it whole).
    chalk.visible = true;
    chalkMat.opacity = 0.9;
    const beat = numeralBeat(t, tellAt);
    glow.visible = beat > 0 || state.phase === 'FAKE';
    glowMat.opacity = beat > 0 ? 0.75 * beat : 0.25;

    // FAKE: the mouth-door spawns beside the real one.
    fakeDoor.visible = state.phase === 'FAKE';
    jambL.visible = state.phase === 'FAKE';
    jambR.visible = state.phase === 'FAKE';
  }

  function dispose(): void {
    for (const m of [chalk, glow, fakeDoor, jambL, jambR]) m.geometry.dispose();
    chalkMat.dispose();
    glowMat.dispose();
    fakeMat.dispose();
    jambMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 5, update, dispose };
}
