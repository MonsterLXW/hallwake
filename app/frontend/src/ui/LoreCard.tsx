// HALLWAKE — safe-room lore card (T4 spec): appears on entry to lore doors
// (3, 11, 20), Courier Prime "typescript" voice on a flat plate, 4 s
// auto-dismiss handled in uiStore. Display-only: the text is canned or
// server flavor, rendered via textContent, never parsed into the game.

import { useUIStore } from '../state/uiStore';

export default function LoreCard() {
  const text = useUIStore((s) => s.flavorText);
  if (!text) return null;
  return (
    <aside
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(var(--hud-safe) + var(--hud-gauge-h) + var(--space-5))',
        transform: 'translateX(-50%)',
        maxWidth: 'var(--measure-prose)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-plate-alpha)',
        border: 'var(--border-plate)',
        fontFamily: 'var(--font-prose)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--leading-prose)',
        color: 'var(--color-ink-secondary)',
        pointerEvents: 'none',
      }}
    >
      {text}
    </aside>
  );
}
