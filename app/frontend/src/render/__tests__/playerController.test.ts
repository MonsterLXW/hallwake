// HALLWAKE — strafe/forward mapping regression. Guards the bug where pressing
// A moved the player right (and vice-versa): the camera at rotation.y = yaw+PI
// has screen-right = world (-cos yaw, sin yaw), so strafe-right must map there.

import { describe, expect, it } from 'vitest';
import { mouseLook, rotateIntent, stickLook } from '../playerController';

const near = (a: number, b: number): number => Math.abs(a - b);

describe('rotateIntent — camera-relative movement maps to the correct world axes', () => {
  it('at yaw 0 (facing +z), W walks +z (forward, away from the camera)', () => {
    const m = rotateIntent(1, 0, 0);
    expect(near(m.mx, 0)).toBeLessThan(1e-9);
    expect(near(m.mz, 1)).toBeLessThan(1e-9);
  });

  it('at yaw 0, D (strafe right) moves world -x, which is screen-right for this camera', () => {
    const m = rotateIntent(0, 1, 0);
    // screen-right at yaw 0 is world (-cos0, sin0) = (-1, 0)
    expect(near(m.mx, -1)).toBeLessThan(1e-9);
    expect(near(m.mz, 0)).toBeLessThan(1e-9);
  });

  it('A is the exact opposite of D (no left/right inversion)', () => {
    const d = rotateIntent(0, 1, 0.7); // arbitrary yaw
    const a = rotateIntent(0, -1, 0.7);
    expect(near(d.mx + a.mx, 0)).toBeLessThan(1e-9);
    expect(near(d.mz + a.mz, 0)).toBeLessThan(1e-9);
  });

  it('strafe stays perpendicular to forward at an arbitrary yaw', () => {
    const yaw = 1.1;
    const fwd = rotateIntent(1, 0, yaw);
    const str = rotateIntent(0, 1, yaw);
    const dot = fwd.mx * str.mx + fwd.mz * str.mz;
    expect(near(dot, 0)).toBeLessThan(1e-9);
  });

  it('screen-right is world (-cos yaw, sin yaw) at any yaw', () => {
    for (const yaw of [0, 0.5, 1.3, -2.0, 3.0]) {
      const m = rotateIntent(0, 1, yaw);
      expect(near(m.mx, -Math.cos(yaw))).toBeLessThan(1e-9);
      expect(near(m.mz, Math.sin(yaw))).toBeLessThan(1e-9);
    }
  });
});

// Turning regression: with camera rotation.y = yaw+PI, d(view)/d(yaw) =
// -screen-right, so POSITIVE yaw turns the view LEFT. Mouse-right must
// therefore DECREASE yaw (and stick-right likewise). This was inverted while
// strafe was correct — the user experienced it as "controls wrong again".
describe('look — mouse/stick yaw must turn the view toward screen-right', () => {
  // The view derivative w.r.t. yaw is (cos yaw, -sin yaw) = -screen-right, so
  // a rightward turn requires yawD < 0: dot(Δview, screen-right) = -yawD > 0.
  it('mouse right yields yawD < 0 (view turns toward screen-right)', () => {
    const l = mouseLook(120, 0);
    expect(l.yawD).toBeLessThan(0);
    expect(-l.yawD).toBeGreaterThan(0); // dot(Δview, screen-right) at yaw 0
  });

  it('mouse left yields yawD > 0, symmetric with right', () => {
    const r = mouseLook(120, 0);
    const l = mouseLook(-120, 0);
    expect(l.yawD).toBeGreaterThan(0);
    expect(near(r.yawD + l.yawD, 0)).toBeLessThan(1e-12);
  });

  it('mouse up (movementY < 0) yields pitchD > 0 — camera +pitch looks up', () => {
    expect(mouseLook(0, -100).pitchD).toBeGreaterThan(0);
    expect(mouseLook(0, 100).pitchD).toBeLessThan(0);
  });

  it('stick right (ax2 > 0) turns right (yawD < 0); stick up (ax3 < 0) looks up', () => {
    expect(stickLook(0.8, 0).yawD).toBeLessThan(0);
    expect(stickLook(-0.8, 0).yawD).toBeGreaterThan(0);
    expect(stickLook(0, -0.8).pitchD).toBeGreaterThan(0);
    expect(stickLook(0, 0.8).pitchD).toBeLessThan(0);
  });

  it('stick deadzone yields zero look', () => {
    const l = stickLook(0.1, -0.1);
    expect(Math.abs(l.yawD)).toBe(0); // -0 vs 0: compare magnitude
    expect(Math.abs(l.pitchD)).toBe(0);
  });
});
