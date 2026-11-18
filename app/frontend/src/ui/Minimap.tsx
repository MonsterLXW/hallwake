// HALLWAKE — Wave 4 minimap plate (features.md): a top-down plan of the
// current room, drawn as pure SVG from the loop's minimapData(sim) selector.
// It is DOM/SVG HUD — no 3D draw, no budget cost. Walls and props are bone
// greys, the exit is a bone bar (padlocked when it needs a PICK), the closet
// is a dashed nook, Prospect loot is a bone diamond, and live entity blips
// wear their entity's signal hue — the same channel the tell glyphs use, so
// the map never introduces a new color language. Radius 0, plates +
// hairlines, tokens only.

import { useUIStore } from '../state/uiStore';
import type { EntityKind } from '../core/types';

// 10 SVG units per metre; z runs up the plate (the exit north wall is top).
const SCALE = 10;
const sx = (x: number): number => x * SCALE;
const sz = (z: number): number => (10 - z) * SCALE;

const BLIP_FILL: Record<EntityKind, string> = {
  GAUNT: 'var(--signal-gaunt)',
  MURMUR: 'var(--signal-murmur)',
  TALLY: 'var(--signal-tally)',
  CINDER: 'var(--signal-cinder)',
  STARE: 'var(--signal-stare)',
  GRIP: 'var(--signal-grip)',
};

export default function Minimap() {
  const m = useUIStore((s) => s.hud.minimap);

  // player chevron: world facing (sin yaw, cos yaw) -> plate coords
  const px = sx(m.player.x);
  const pz = sz(m.player.z);
  const fx = Math.sin(m.player.yaw);
  const fz = Math.cos(m.player.yaw);
  const tipX = px + fx * 11;
  const tipY = pz - fz * 11;
  const baseX = px - fx * 5;
  const baseY = pz + fz * 5;
  const chevron = `${tipX},${tipY} ${baseX - fz * 5},${baseY - fx * 5} ${baseX + fz * 5},${baseY + fx * 5}`;

  const blipNames = m.blips.map((b) => b.kind).join(', ');

  return (
    <div
      style={{
        position: 'absolute',
        top: 'var(--hud-safe)',
        right: 'var(--hud-safe)',
        background: 'var(--color-plate-alpha)',
        border: 'var(--border-plate)',
        padding: 'var(--space-2)',
      }}
      role="img"
      aria-label={`room map, door ${m.door}${m.blips.length ? `, threats: ${blipNames}` : ', no threats visible'}`}
    >
      <svg
        viewBox="0 0 140 100"
        width="150"
        height="107"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {/* room shell */}
        <rect x="0.75" y="0.75" width="138.5" height="98.5" fill="var(--color-plate-sunken)" stroke="var(--color-rule-strong)" strokeWidth="1.5" />
        {/* prop walls (the archetype colliders) */}
        {m.colliders.map((c, i) => (
          <rect
            key={i}
            x={sx(c.x0)}
            y={sz(c.z1)}
            width={(c.x1 - c.x0) * SCALE}
            height={(c.z1 - c.z0) * SCALE}
            fill="var(--color-rule-strong)"
          />
        ))}
        {/* exit door: bone bar on the north edge; padlocked when it needs a PICK */}
        <rect x={sx(7 - 0.7)} y={0} width={1.4 * SCALE} height={3} fill={m.locked ? 'var(--color-ink-muted)' : 'var(--color-ink)'} />
        {m.locked && (
          <g stroke="var(--color-ink)" strokeWidth="1.4" fill="none">
            <path d={`M ${sx(7) - 3} 9 a 3 3 0 0 1 6 0`} />
            <rect x={sx(7) - 4.5} y={9} width={9} height={7} fill="var(--color-ink)" stroke="none" />
          </g>
        )}
        {/* closet: dashed nook outline */}
        {m.closet && (
          <rect
            x={sx(m.closet.x0)}
            y={sz(m.closet.z1)}
            width={(m.closet.x1 - m.closet.x0) * SCALE}
            height={(m.closet.z1 - m.closet.z0) * SCALE}
            fill="none"
            stroke="var(--color-ink-muted)"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        )}
        {/* Prospect loot glint: bone diamond (items are information, never signal hues) */}
        {m.loot && (
          <rect
            x={sx(m.loot.x) - 3.2}
            y={sz(m.loot.z) - 3.2}
            width={6.4}
            height={6.4}
            fill="var(--color-accent)"
            transform={`rotate(45 ${sx(m.loot.x)} ${sz(m.loot.z)})`}
          />
        )}
        {/* live entity blips */}
        {m.blips.map((b, i) => (
          <circle key={i} cx={sx(b.x)} cy={sz(b.z)} r="3.4" fill={BLIP_FILL[b.kind]} stroke="var(--color-plate-sunken)" strokeWidth="1" />
        ))}
        {/* the porter: bone chevron showing the view */}
        <polygon points={chevron} fill="var(--color-ink)" />
      </svg>
      <div
        style={{
          marginTop: 'var(--space-1)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
        }}
      >
        Room {String(m.door).padStart(2, '0')}
      </div>
    </div>
  );
}
