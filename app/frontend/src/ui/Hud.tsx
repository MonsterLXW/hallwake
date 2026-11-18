// HALLWAKE — placeholder HUD (T2 greybox). Shows the door numeral and the
// oil number only, corner-anchored per the kit slots (design-brief §6).
// T4 replaces this with the full diegetic kit (door log, gauge, tells).

import { useUIStore } from '../state/uiStore';

export default function Hud() {
  const hud = useUIStore((s) => s.hud);
  return (
    <div aria-live="polite" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          right: 'var(--hud-safe)',
          bottom: 'var(--hud-safe)',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'var(--text-numeral)',
          lineHeight: 'var(--leading-tight)',
          letterSpacing: 'var(--tracking-stencil)',
          color: 'var(--color-ink)',
        }}
      >
        {String(hud.door).padStart(2, '0')}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 'var(--hud-safe)',
          bottom: 'var(--hud-safe)',
          padding: 'var(--hud-plate-pad)',
          background: 'var(--color-plate-alpha)',
          border: 'var(--border-plate)',
          borderRadius: 'var(--radius-0)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'var(--text-xs)',
          color: hud.oil <= 0.2 ? 'var(--color-alarm)' : 'var(--color-ink)',
        }}
      >
        OIL {Math.round(hud.oil * 100)}%
      </div>
    </div>
  );
}
