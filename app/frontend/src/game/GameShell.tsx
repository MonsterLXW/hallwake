// HALLWAKE — the shell that owns the canvas (architecture.md §2). Mounts the
// Three scene once, runs the fixed-timestep loop (entities + audio are wired
// inside loop.ts), and switches the kiosk screens by uiStore phase:
// attract -> playing -> paused/dead/run -> attract. React renders overlays
// only; the corridor itself is WebGL. Dev params:
//   ?fps=1       corner-anchored FPS meter (mono bone, never centered, §9)
//   ?auto=1      autopilot plays doors 1-24 hands-free (perf-gate entry)
//   ?quality=low|mid|high   pin a tier; otherwise the shell probes real fps
//                during attract and steps the tier down until it holds ~60.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createScene } from '../render/scene';
import { PlayerController } from '../render/playerController';
import { startLoop, type LoopHandle } from '../render/loop';
import { parseQuality, type Quality } from '../render/quality';
import { runCardFrom } from '../core/scoring';
import { useUIStore, LORE_DOORS } from '../state/uiStore';
import { fetchFlavor } from '../net/flavorClient';
import { pickLine } from '../net/canned';
import { getScores } from '../net/scoresClient';
import Hud from '../ui/Hud';
import AttractScreen from '../ui/AttractScreen';
import DeathCard from '../ui/DeathCard';
import RunCard from '../ui/RunCard';
import LoreCard from '../ui/LoreCard';

const newSeed = (): number => (Date.now() % 1_000_000_000) | 0;
const stepDown = (q: Quality): Quality => (q === 'high' ? 'mid' : 'low');

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<LoopHandle | null>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const [quality, setQuality] = useState<Quality>(() =>
    parseQuality(new URLSearchParams(window.location.search).get('quality')),
  );

  const params = new URLSearchParams(window.location.search);
  const showFps = params.get('fps') === '1';
  const autopilot = params.get('auto') === '1';
  const pinnedQuality = params.get('quality') !== null;

  const phase = useUIStore((s) => s.phase);

  const begin = useCallback(() => {
    const s = useUIStore.getState();
    if (s.phase === 'attract') {
      const seed = newSeed();
      s.setSeed(seed);
      loopRef.current?.reset(seed);
      s.setPhase('playing');
    }
    loopRef.current?.wakeAudio(); // gamepad begins never fire key listeners
    if (!autopilot) controllerRef.current?.lock();
    s.markActivity();
  }, [autopilot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createScene(canvas, quality);
    const controller = new PlayerController(canvas, {
      onLockChange: (locked) => {
        const s = useUIStore.getState();
        if (s.phase === 'playing' && !locked) s.setPhase('paused');
        else if (s.phase === 'paused' && locked) s.setPhase('playing');
      },
    });
    controller.attach();
    controllerRef.current = controller;

    const seed = useUIStore.getState().seed || newSeed();
    useUIStore.getState().setSeed(seed);

    const loop = startLoop({
      scene,
      controller,
      seed,
      autopilot,
      isPaused: () => {
        const p = useUIStore.getState().phase;
        return p === 'attract' || p === 'paused';
      },
      onHud: (h) => useUIStore.getState().setHud(h),
      onActivity: () => useUIStore.getState().markActivity(),
      onPhase: (p) => {
        const s = useUIStore.getState();
        if (s.phase === 'attract' || s.phase === 'paused') return;
        if (s.phase === p) return;
        if (p === 'run' && !s.runCard) s.setRunCard(runCardFrom(loop.state()));
        s.setPhase(p);
      },
      onEvent: (ev) => {
        // canned line renders instantly (deterministic, first-class content);
        // the server line upgrades it when /api/flavor answers in time.
        if (ev.type === 'door_open' && LORE_DOORS.has(ev.door)) {
          useUIStore.getState().setLore(pickLine('lore', ev.door));
          void fetchFlavor({ kind: 'lore', door: ev.door }).then((r) =>
            useUIStore.getState().setLore(r.text),
          );
        } else if (ev.type === 'death') {
          useUIStore.getState().setEpitaph(pickLine('epitaph', ev.door));
          void fetchFlavor({
            kind: 'epitaph',
            door: ev.door,
            entity: ev.entity,
            deaths: loop.state().deaths,
          }).then((r) => useUIStore.getState().setEpitaph(r.text));
        }
      },
    });
    loopRef.current = loop;

    const onResize = (): void => scene.resize();
    window.addEventListener('resize', onResize);

    const fpsTimer = showFps
      ? window.setInterval(() => {
          if (fpsRef.current) fpsRef.current.textContent = `${Math.round(loop.fps())} FPS`;
        }, 500)
      : 0;

    // kiosk input: any key begins from attract, otherwise it marks activity
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') return; // Esc releases the lock (pause)
      if (useUIStore.getState().phase === 'attract') begin();
      else useUIStore.getState().markActivity();
    };
    const onPointer = (): void => {
      if (useUIStore.getState().phase === 'attract') begin();
      else useUIStore.getState().markActivity();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);

    // gamepad is the preferred booth input: poll it on the attract screen
    let padTimer = 0;
    if (!autopilot) {
      padTimer = window.setInterval(() => {
        if (useUIStore.getState().phase !== 'attract') return;
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads
          ? navigator.getGamepads()
          : null;
        const gp = pads && pads[0];
        if (gp && (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed)) begin();
      }, 120);
    }

    if (autopilot) {
      useUIStore.getState().setPhase('playing');
      loop.wakeAudio();
    }

    // leaderboard mirror for the attract ledger
    void getScores(5).then((r) => useUIStore.getState().setScores(r.scores, r.source));

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      if (fpsTimer) window.clearInterval(fpsTimer);
      if (padTimer) window.clearInterval(padTimer);
      loop.stop();
      controller.detach();
      scene.dispose();
      loopRef.current = null;
      controllerRef.current = null;
    };
  }, [quality, autopilot, showFps, begin]);

  // attract idle-reset: the store's 30 s timer flips phase back to attract;
  // the shell wipes the run so the next input starts at door 1.
  useEffect(() => {
    if (phase !== 'attract') return;
    loopRef.current?.reset(newSeed());
    controllerRef.current?.release();
    void getScores(5).then((r) => useUIStore.getState().setScores(r.scores, r.source));
  }, [phase]);

  // kiosk quality auto-detect: probe real rendered fps during the first
  // seconds (the attract scene renders every frame) and step the tier down
  // until it holds the booth's 60 fps target. Pinned via ?quality= skips it.
  useEffect(() => {
    if (pinnedQuality || autopilot) return;
    const probe = (): void => {
      const fps = loopRef.current?.fps() ?? 0;
      if (fps > 0 && fps < 45) setQuality((q) => (q === 'low' ? q : stepDown(q)));
    };
    const t1 = window.setTimeout(probe, 3000);
    const t2 = window.setTimeout(probe, 6000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [quality, pinnedQuality, autopilot]);

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

      {(phase === 'playing' || phase === 'paused' || phase === 'dead') && <Hud />}
      {phase === 'playing' && <LoreCard />}

      {phase === 'paused' && (
        <div
          role="dialog"
          aria-label="paused"
          onClick={() => controllerRef.current?.lock()}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-plate-alpha)',
            cursor: 'pointer',
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

      {phase === 'dead' && <DeathCard />}
      {phase === 'run' && <RunCard onNewRun={begin} />}
      {phase === 'attract' && <AttractScreen onBegin={begin} />}

      {showFps && (
        <div
          ref={fpsRef}
          style={{
            position: 'absolute',
            top: 'var(--hud-safe)',
            right: 'var(--hud-safe)',
            zIndex: 'var(--z-hud)',
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
    </div>
  );
}
