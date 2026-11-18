// HALLWAKE — attract screen (design-brief §1: the characteristic opening).
// The page opens on the door row: all 24 numerals 01-24 as one full-width
// stenciled band, bone on void, hairline rule beneath; the masthead sits
// above it flush-left with booth metadata flush-right; PRESS ANY KEY
// breathes below in mono. The lantern glow sweeping the row on a 6 s loop
// is functional kiosk signage — under prefers-reduced-motion it parks on
// door 01 and the prompt goes static. Last-5 ledger at the bottom.

import { useEffect, useMemo } from 'react';
import { useUIStore } from '../state/uiStore';
import Leaderboard from './Leaderboard';

const DOOR_BAND = Array.from({ length: 24 }, (_, i) => i + 1);

export default function AttractScreen({ onBegin }: { onBegin(): void }) {
  const scores = useUIStore((s) => s.scores);
  const scoresSource = useUIStore((s) => s.scoresSource);
  const reduced = useMemo(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    // focus the begin affordance so keyboard users can Enter straight in
    document.getElementById('hw-begin')?.focus();
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--hud-safe) var(--space-7)',
        gap: 'var(--space-5)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes hw-sweep { from { transform: translateX(-40%); } to { transform: translateX(140%); } }
        @keyframes hw-breathe { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
      `}</style>

      {/* masthead band: title flush-left, booth metadata flush-right */}
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--space-5)',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-masthead)',
            letterSpacing: 'var(--tracking-stencil)',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
            lineHeight: 'var(--leading-tight)',
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
            color: 'var(--color-ink-muted)',
            textAlign: 'right',
          }}
        >
          24 doors · one lantern · learn the schedule or be learned by it
        </p>
      </header>

      {/* the door row — the product's core image as brand graphic */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          borderTop: '1px solid var(--color-rule-strong)',
          borderBottom: 'var(--border-hairline)',
          padding: 'var(--space-3) 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(28px, 4.6vh, 64px)',
            letterSpacing: 'var(--tracking-stencil)',
            color: 'var(--color-ink)',
            whiteSpace: 'nowrap',
          }}
        >
          {DOOR_BAND.map((d) => (
            <span key={d}>{String(d).padStart(2, '0')}</span>
          ))}
        </div>
        {/* lantern glow sweep: 6 s idle loop, parked on 01 under reduced motion */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '34%',
            background:
              'radial-gradient(closest-side, rgba(227,215,188,0.16), rgba(227,215,188,0.05) 60%, transparent 75%)',
            left: reduced ? '0%' : undefined,
            animation: reduced ? undefined : 'hw-sweep var(--motion-sweep) linear infinite',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* begin affordance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button
          id="hw-begin"
          type="button"
          onClick={onBegin}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-accent-ink)',
            background: 'var(--color-accent)',
            border: 'var(--border-plate)',
            borderRadius: 'var(--radius-0)',
            padding: 'var(--space-3) var(--space-6)',
            cursor: 'pointer',
            animation: reduced ? undefined : 'hw-breathe 2400ms ease-in-out infinite',
          }}
        >
          Press any key · take the lantern
        </button>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-ink-muted)',
          }}
        >
          WASD move · mouse look · E interact · Esc pause · gamepad: left stick move, right stick look, A interact
        </p>
      </div>

      {/* last five, as a ruled ledger — passersby see the booth's history */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <h2
          style={{
            margin: '0 0 var(--space-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
            fontWeight: 400,
          }}
        >
          Last five logged runs {scoresSource === 'local' ? '· local mirror' : ''}
        </h2>
        <Leaderboard scores={scores.slice(0, 5)} compact />
      </div>
    </div>
  );
}
