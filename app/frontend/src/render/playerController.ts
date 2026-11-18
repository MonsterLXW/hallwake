// HALLWAKE — input -> Frame producer (architecture.md §6). Pointer Lock WASD
// + mouse look + E interact, and a gamepad path with the SAME Frame output
// (left stick move, right stick look, A/X interact). Booth note: gamepad is
// the preferred kiosk input — pointer lock on a shared kiosk mouse is
// hostile — and because both paths emit identical Frames, the gamepad adds
// zero sim risk. Movement intent is rotated by the current yaw into
// room/world axes here, so stepSim stays a pure axis-aligned reducer.

import type { Frame } from '../core/types';

export interface ControllerHooks {
  onLockChange(locked: boolean): void;
}

const LOOK_SENS = 0.0024; // rad per px of mouse movement
const STICK_LOOK = 0.05; // rad per tick at full right-stick deflection
const DEADZONE = 0.15;

export class PlayerController {
  private keys = new Set<string>();
  private yawDelta = 0;
  private interactEdge = false;
  private prevPadInteract = false;
  private locked = false;
  private frame: Frame = { mx: 0, mz: 0, yawD: 0, interact: false };

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: ControllerHooks,
  ) {}

  get isLocked(): boolean {
    return this.locked;
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onLockChange);
    this.canvas.addEventListener('mousedown', this.onCanvasDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    this.canvas.removeEventListener('mousedown', this.onCanvasDown);
    this.keys.clear();
  }

  lock(): void {
    if (!this.locked) void this.canvas.requestPointerLock();
  }

  release(): void {
    if (this.locked && typeof document.exitPointerLock === 'function') document.exitPointerLock();
  }

  private onCanvasDown = (): void => {
    this.lock();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) this.interactEdge = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return;
    this.yawDelta += e.movementX * LOOK_SENS;
  };

  private onLockChange = (): void => {
    // Esc releases the lock natively; the browser fires this event.
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) this.keys.clear();
    this.hooks.onLockChange(this.locked);
  };

  // Called once per sim tick. Consumes accumulated look delta and emits the
  // reused Frame object (no per-frame allocation in the loop).
  readFrame(yaw: number): Frame {
    const f = this.frame;
    let fwd = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    let str = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);

    const pad = this.pollGamepad();
    if (pad) {
      fwd += pad.fwd;
      str += pad.str;
      this.yawDelta += pad.yawD;
      if (pad.interact && !this.prevPadInteract) this.interactEdge = true;
      this.prevPadInteract = pad.interact;
    } else {
      this.prevPadInteract = false;
    }

    const mag = Math.hypot(fwd, str);
    if (mag > 1) {
      fwd /= mag;
      str /= mag;
    }
    // rotate camera-relative intent into world axes (yaw 0 faces +z / north)
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);
    f.mx = s * fwd + c * str;
    f.mz = c * fwd - s * str;
    f.yawD = this.yawDelta;
    this.yawDelta = 0;
    f.interact = this.interactEdge;
    this.interactEdge = false;
    return f;
  }

  private pollGamepad(): { fwd: number; str: number; yawD: number; interact: boolean } | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    const gp = pads && pads[0];
    if (!gp) return null;
    const dz = (v: number) => (Math.abs(v) < DEADZONE ? 0 : v);
    return {
      fwd: -dz(gp.axes[1] ?? 0),
      str: dz(gp.axes[0] ?? 0),
      yawD: dz(gp.axes[2] ?? 0) * STICK_LOOK,
      interact: !!(gp.buttons[0]?.pressed || gp.buttons[2]?.pressed), // A / X
    };
  }
}
