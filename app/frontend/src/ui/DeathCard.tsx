// HALLWAKE — death card (design-brief §6): full-screen for the sim's 1.5 s
// freeze — vignette + door numeral + epitaph in Courier Prime italic. The
// epitaph renders from uiStore (canned instantly, upgraded by the server if
// it answers); textContent only, never game state. It unmounts when the sim
// respawns at the checkpoint (phase returns to playing).

import { useUIStore } from '../state/uiStore';

export default function DeathCard() {
  const door = useUIStore((s) => s.hud.door);
  const epitaph = useUIStore((s) => s.epitaph);

  return (
    <div
      aria-live="assertive"
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(120% 120% at 50% 45%, rgba(10,10,14,0.55) 30%, var(--color-plate-sunken) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        textAlign: 'center',
        padding: 'var(--hud-safe)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'var(--text-numeral)',
          lineHeight: 'var(--leading-tight)',
          letterSpacing: 'var(--tracking-stencil)',
          color: 'var(--color-ink)',
        }}
        aria-hidden="true"
      >
        {String(door).padStart(2, '0')}
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-prose)',
          fontStyle: 'italic',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-prose)',
          color: 'var(--color-ink-secondary)',
          maxWidth: 'var(--measure-prose)',
        }}
      >
        {epitaph ?? 'The corridor keeps you. Back to the last checkpoint.'}
      </p>
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
        Respawning at the checkpoint
      </p>
    </div>
  );
}
