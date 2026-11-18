// HALLWAKE — the shell that owns the canvas (architecture.md §2). Mounts the
// Three scene once, runs the fixed-timestep loop, and bridges sim -> uiStore.
// React renders overlays only; the corridor itself is WebGL. Dev params:
//   ?fps=1     corner-anchored FPS meter (mono bone, never centered, §9)
//   ?auto=1    autopilot plays doors 1-24 hands-free (perf-gate entry)
//   ?quality=low|mid|high

import { useEffect, useRef } from 'react';
import { createScene } from '../render/scene';
import { PlayerController } from '../render/playerController';
import { startLoop } from '../render/loop';
import { parseQuality } from '../render/quality';
import { useUIStore } from '../state/uiStore';
import Hud from '../ui/Hud';

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const beginRef = useRef<() => void>(() => {});
  const phase = useUIStore((s) => s.phase);
  const paused = useUIStore((s) => s.paused);

  const params = new URLSearchParams(window.location.search);
  const showFps = params.get('fps') === '1';
  const autopilot = params.get('auto') === '1';
  const quality = parseQuality(params.get('quality'));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createScene(canvas, quality);
    const controller = new PlayerController(canvas, {
      onLockChange: (locked) => {
        const s = useUIStore.getState();
        if (s.phase === 'attract') return;
        s.setPaused(!locked);
      },
    });
    controller.attach();

    const loop = startLoop({
      scene,
      controller,
      seed: (Date.now() % 1_000_000_000) | 0,
      autopilot,
      isPaused: () => {
        const s = useUIStore.getState();
        return s.paused || s.phase === 'attract';
      },
      onHud: (h) => useUIStore.getState().setHud(h),
      onPhase: (p) => {
        const s = useUIStore.getState();
        if (s.phase !== 'attract') s.setPhase(p);
      },
    });

    const onResize = (): void => scene.resize();
    window.addEventListener('resize', onResize);

    const fpsTimer = showFps
      ? window.setInterval(() => {
          if (fpsRef.current) fpsRef.current.textContent = `${Math.round(loop.fps())} FPS`;
        }, 500)
      : 0;

    const begin = (): void => {
      const s = useUIStore.getState();
      if (s.phase === 'attract') s.setPhase('playing');
      if (s.paused) s.setPaused(false);
      if (!autopilot) controller.lock();
    };
    beginRef.current = begin;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') return; // Esc releases the lock (pause)
      begin();
    };
    window.addEventListener('keydown', onKey);
    if (autopilot) useUIStore.getState().setPhase('playing');

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      if (fpsTimer) window.clearInterval(fpsTimer);
      loop.stop();
      controller.detach();
      scene.dispose();
    };
  }, [quality, autopilot, showFps]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg)',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* vignette: CSS overlay, not a post pass (architecture §3) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 120% at 50% 45%, transparent 52%, var(--color-plate-sunken) 100%)',
        }}
      />

      {phase !== 'attract' && <Hud />}

      {showFps && (
        <div
          ref={fpsRef}
          style={{
            position: 'absolute',
            top: 'var(--hud-safe)',
            right: 'var(--hud-safe)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            color: 'var(--color-ink)',
            background: 'var(--color-plate-alpha)',
            border: 'var(--border-plate)',
            padding: 'var(--space-1) var(--space-2)',
          }}
        >
          -- FPS
        </div>
      )}

      {phase === 'attract' && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => beginRef.current()}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-5)',
            cursor: 'pointer',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'var(--text-masthead)',
              letterSpacing: 'var(--tracking-stencil)',
              color: 'var(--color-ink)',
              textTransform: 'uppercase',
            }}
          >
            Hallwake
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--color-ink-secondary)',
            }}
          >
            Click or press any key to take the lantern
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-ink-muted)',
            }}
          >
            WASD move · mouse look · E interact · Esc pause · gamepad supported
          </p>
        </div>
      )}

      {paused && phase !== 'attract' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-plate-alpha)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
              border: 'var(--border-plate)',
              padding: 'var(--space-4) var(--space-6)',
            }}
          >
            Paused — click to resume
          </p>
        </div>
      )}

      {phase === 'dead' && (
        <div
          aria-live="assertive"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-prose)',
            fontStyle: 'italic',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-ink-secondary)',
            pointerEvents: 'none',
          }}
        >
          The corridor keeps you. Back to the last checkpoint.
        </div>
      )}

      {phase === 'run' && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'var(--text-xl)',
              letterSpacing: 'var(--tracking-stencil)',
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
            }}
          >
            Door 24 open — you walk out
          </p>
          <p
            style={{
              margin: 'var(--space-2) 0 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              letterSpacing: 'var(--tracking-label)',
              color: 'var(--color-ink-muted)',
            }}
          >
            Run card lands in T4
          </p>
        </div>
      )}
    </div>
  );
}
