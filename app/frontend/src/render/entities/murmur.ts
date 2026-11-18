// HALLWAKE — MURMUR (architecture.md §5, design-brief §3). It is darkness
// itself: a moth-swarm point cluster with a hollow face pressed into the
// wall behind it. Deliberately HUELESS (brief §3) — its channel is
// luminance + audio + the ring glyph, never a signal color. HUNT: the swarm
// drifts (deterministic trig, no RNG) and closes in; FROZEN: the lantern
// beam holds it, the swarm goes still and reads clearer — the beam IS the
// counterplay, so freezing must be the most legible state.

import * as THREE from 'three';
import type { MurmurState } from '../../core/types';
import { DEFAULT_CTX, getFaceTexture, TOKEN, tokenColor, type EntityCtx, type EntityVisual } from './fx';

const SWARM_N = 26;

// deterministic cluster: integer-hash offsets, never Math.random
function hash1(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function buildMurmur(): EntityVisual<MurmurState> {
  const group = new THREE.Group();

  const base = new Float32Array(SWARM_N * 3);
  for (let i = 0; i < SWARM_N; i++) {
    base[i * 3] = (hash1(i, 3) - 0.5) * 1.1;
    base[i * 3 + 1] = 1.0 + (hash1(i, 7) - 0.5) * 1.3;
    base[i * 3 + 2] = (hash1(i, 11) - 0.5) * 1.1;
  }
  const pos = new Float32Array(base);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const swarmMat = new THREE.PointsMaterial({
    color: new THREE.Color(tokenColor('--signal-murmur', TOKEN.murmur)),
    size: 0.07,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const swarm = new THREE.Points(geo, swarmMat);

  const faceMat = new THREE.MeshBasicMaterial({
    map: getFaceTexture(),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), faceMat);
  face.position.set(0, 1.5, -0.45);

  const hazeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(tokenColor('--signal-murmur', TOKEN.murmur)),
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const hazeL = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), hazeMat);
  hazeL.position.set(-0.45, 1.3, -0.2);
  const hazeR = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), hazeMat);
  hazeR.position.set(0.45, 1.3, -0.2);

  group.add(swarm, face, hazeL, hazeR);

  function update(state: MurmurState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    if (state.phase === 'BANISHED') {
      group.visible = false; // WARD terminal: the swarm is gone
      return;
    }
    group.visible = true;

    const frozen = state.phase === 'FROZEN';
    const amp = frozen ? 0 : 0.06;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < SWARM_N; i++) {
      const j = i * 3;
      attr.setXYZ(
        i,
        base[j] + amp * Math.sin(t * 2.3 + i * 1.3),
        base[j + 1] + amp * Math.cos(t * 1.9 + i * 2.1),
        base[j + 2] + amp * Math.sin(t * 1.7 + i * 0.7),
      );
    }
    attr.needsUpdate = true;

    // luminance channel: nearer = clearer; the beam freezing it reads as a
    // steadier, brighter shape — never a hue change (brief §3).
    const dist = Number.isFinite(state.dist) ? state.dist : 8;
    const prox = Math.max(0.15, Math.min(0.95, 1.15 - dist / 9));
    swarmMat.opacity = frozen ? Math.min(1, prox + 0.2) : prox;
    faceMat.opacity = frozen ? 0.75 : 0.5;
    hazeMat.opacity = frozen ? 0.05 : 0.09;

    const dx = ctx.playerX - state.x;
    const dz = ctx.playerZ - state.z;
    if (dx !== 0 || dz !== 0) group.rotation.y = Math.atan2(dx, dz);
  }

  function dispose(): void {
    geo.dispose();
    face.geometry.dispose();
    hazeL.geometry.dispose();
    hazeR.geometry.dispose();
    swarmMat.dispose();
    faceMat.dispose();
    hazeMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 4, update, dispose };
}
