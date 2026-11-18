// HALLWAKE — Wave 3 level-up perk plate (features.md). The loop holds the
// corridor still while this is up; the porter answers with number keys 1-3
// (works under pointer lock) or by clicking. The choices come from the
// deterministic perkChoices() table — the overlay never invents options.
// Same visual language as the rest of the kit: plates + hairlines, radius 0,
// bone ink on void, mono labels, display names, prose blurbs. No blur, no
// glow, no rounded cards.

import { useEffect } from 'react';
import { useUIStore } from '../state/uiStore';
import { perkChoices, type PerkId } from '../core/progression';

const PERK_COPY: Record<PerkId, { name: string; blurb: string }> = {
  EXTRA_TONIC: {
    name: 'Extra Tonic',
    blurb: 'The kit starts every run with a tonic — one death talked out of the way.',
  },
  BRIGHT_LANTERN: {
    name: 'Brighter Lantern',
    blurb: 'The beam throws 1.5 metres farther; the dark gives a little ground.',
  },
  PROSPECT: {
    name: 'Prospect',
    blurb: 'You always know where the loot lies. The corridor keeps fewer secrets.',
  },
  FASTER_WALK: {
    name: 'Faster Walk',
    blurb: 'Twelve percent longer strides. Still no sprint — the booth never sprints.',
  },
  IRON_NERVE: {
    name: 'Iron Nerve',
    blurb: 'The tells linger longer before they bite. More time to answer them.',
  },
};

export default function PerkOverlay({ onChoose }: { onChoose(p: PerkId): void }) {
  const perks = useUIStore((s) => s.hud.perks);
  const level = useUIStore((s) => s.hud.level);
  const choices = perkChoices(perks);
  // The HUD snapshot churns at 10 Hz (new array identity); the effect must
  // only re-arm when the offered set actually changes.
  const choicesKey = choices.join('|');

  useEffect(() => {
    document.getElementById('hw-perk-0')?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.code >= 'Digit1' && e.code <= 'Digit3') {
        const i = e.code.charCodeAt(5) - 49;
        if (i < choices.length) {
          e.preventDefault();
          onChoose(choices[i]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choicesKey, onChoose]);

  return (
    <div
      role="dialog"
      aria-label={`Level ${level} — choose a perk`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 'var(--z-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-plate-alpha)',
        padding: 'var(--hud-safe)',
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          background: 'var(--color-plate)',
          border: 'var(--border-plate)',
          padding: 'var(--space-5)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          The corridor rewards you — level {level}
        </p>
        <h2
          style={{
            margin: 'var(--space-1) 0 var(--space-4)',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-lg)',
            lineHeight: 'var(--leading-tight)',
            letterSpacing: 'var(--tracking-stencil)',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
          }}
        >
          Choose a perk
        </h2>

        {choices.map((p, i) => (
          <button
            key={p}
            id={`hw-perk-${i}`}
            type="button"
            onClick={() => onChoose(p)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              borderTop: 'var(--border-hairline)',
              padding: 'var(--space-3) var(--space-2)',
              cursor: 'pointer',
              color: 'var(--color-ink)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-accent-wash)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = 'var(--border-focus)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-ink-muted)',
                border: 'var(--border-hairline)',
                padding: 'var(--space-1) var(--space-2)',
                minWidth: 'var(--space-5)',
                textAlign: 'center',
              }}
            >
              {i + 1}
            </span>
            <span style={{ display: 'block' }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--text-md)',
                  lineHeight: 'var(--leading-ui)',
                  letterSpacing: 'var(--tracking-stencil)',
                  textTransform: 'uppercase',
                }}
              >
                {PERK_COPY[p].name}
              </span>
              <span
                style={{
                  display: 'block',
                  marginTop: 'var(--space-1)',
                  fontFamily: 'var(--font-prose)',
                  fontSize: 'var(--text-2xs)',
                  lineHeight: 'var(--leading-prose)',
                  color: 'var(--color-ink-secondary)',
                }}
              >
                {PERK_COPY[p].blurb}
              </span>
            </span>
          </button>
        ))}

        <p
          style={{
            margin: 'var(--space-4) 0 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          Keys 1-{choices.length} choose · the corridor waits
        </p>
      </div>
    </div>
  );
}
