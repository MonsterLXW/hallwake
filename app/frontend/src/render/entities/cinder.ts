// HALLWAKE — CINDER (architecture.md §5, design-brief §3). A flame wraith
// of stacked cones that hangs at the room's middle sconce. Warm while idle
// (never shown), spectral blue the moment the tell fires — the blue-flame
// swap is the tell, so under reduced motion it crossfades once to the SAME
// steady blue (brief §7). As the blackout timer takes sconces, its inner
// flame dies layer by layer; banish puts it out entirely. No lights of its
// own: the blue is emissive material, the scene pool does the lighting.

import * as THREE from 'three';
import type { CinderState } from '../../core/types';
import { blueFlameSwap, DEFAULT_CTX, TOKEN, type EntityCtx, type EntityVisual } from './fx';

export function buildCinder(): EntityVisual<CinderState> {
  const group = new THREE.Group();
  group.visible = false;

  const outerMat = new THREE.MeshBasicMaterial({ color: TOKEN.warm, transparent: true, opacity: 0.85, depthWrite: false });
  const innerMat = new THREE.MeshBasicMaterial({ color: TOKEN.warm, transparent: true, opacity: 0.9, depthWrite: false });
  const skirtMat = new THREE.MeshBasicMaterial({ color: TOKEN.warm, transparent: true, opacity: 0.6, depthWrite: false });
  const wispMat = new THREE.MeshBasicMaterial({ color: TOKEN.warm, transparent: true, opacity: 0.5, depthWrite: false });
  const aoMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });

  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 8), outerMat);
  outer.position.y = 1.15;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), innerMat);
  inner.position.y = 0.95;
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.75, 8), skirtMat);
  skirt.position.y = 0.38;
  const wispL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 5), wispMat);
  wispL.position.set(-0.35, 1.5, 0);
  wispL.rotation.z = 0.3;
  const wispR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 5), wispMat);
  wispR.position.set(0.35, 1.5, 0);
  wispR.rotation.z = -0.3;
  const ao = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2), aoMat);
  ao.position.y = 0.02;

  group.add(outer, inner, skirt, wispL, wispR, ao);

  function update(state: CinderState, t: number, ctx: EntityCtx = DEFAULT_CTX): void {
    const live = state.phase === 'TELL' || state.phase === 'BLACKOUT';
    group.visible = live;
    if (!live) return;

    // blue-flame swap: spectral blue for the whole tell/blackout window
    const flick = blueFlameSwap(outerMat, true, t, ctx.reducedMotion);
    blueFlameSwap(innerMat, true, t + 0.4, ctx.reducedMotion);
    blueFlameSwap(skirtMat, true, t + 0.8, ctx.reducedMotion);
    blueFlameSwap(wispMat, true, t + 1.2, ctx.reducedMotion);
    group.scale.setScalar(flick);

    // the blackout timer eats the wraith layer by layer
    const dead = state.blackoutCount;
    inner.visible = dead < 1;
    wispL.visible = dead < 2;
    wispR.visible = dead < 2;
    outerMat.opacity = Math.max(0.35, 0.85 - 0.15 * dead);
  }

  function dispose(): void {
    for (const m of [outer, inner, skirt, wispL, wispR, ao]) m.geometry.dispose();
    outerMat.dispose();
    innerMat.dispose();
    skirtMat.dispose();
    wispMat.dispose();
    aoMat.dispose();
    group.clear();
  }

  return { group, primitiveCount: 6, update, dispose };
}
