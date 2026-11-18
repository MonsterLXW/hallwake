// HALLWAKE — the diegetic kit HUD (design-brief §6). This is the night
// porter's working kit: a stenciled door numeral, a ruled door log (the
// TALLY counterplay surface — always on, never animated), a brass oil tube,
// tell glyphs in entity signal colors, and a mono interact prompt. Plates
// + hairlines, radius 0, no blur, no glow. Every value reads uiStore only;
// the sim is never touched from here.

import { useUIStore } from '../state/uiStore';
import { CHECKPOINT_DOORS } from '../core/schedule';
import type { EntityKind } from '../core/types';

const pad2 = (n: number): string => String(n).padStart(2, '0');

// Tell glyphs (brief §6): GAUNT = tall slit, MURMUR = hollow ring,
// TALLY = four-stroke tally, CINDER = flame outline. Color is never the
// sole channel — each tell also carries its distinct glyph shape.
function TellGlyph({ kind }: { kind: EntityKind }) {
  const stroke =
    kind === 'GAUNT'
      ? 'var(--signal-gaunt)'
      : kind === 'TALLY'
        ? 'var(--signal-tally)'
        : kind === 'CINDER'
          ? 'var(--signal-cinder)'
          : 'var(--signal-murmur)';
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      aria-hidden="true"
      style={{
        display: 'block',
        width: 'var(--hud-tell-size)',
        height: 'var(--hud-tell-size)',
      }}
    >
      {kind === 'GAUNT' && <rect x="12" y="2" width="4" height="24" />}
      {kind === 'MURMUR' && <circle cx="14" cy="14" r="10" />}
      {kind === 'TALLY' && (
        <g>
          <path d="M6 4v20M11 4v20M16 4v20M21 4v20" />
          <path d="M3 22 25 6" />
        </g>
      )}
      {kind === 'CINDER' && <path d="M14 3c4 5 7 8 7 13a7 7 0 0 1-14 0c0-5 3-8 7-13Z" />}
    </svg>
  );
}

export default function Hud() {
  const hud = useUIStore((s) => s.hud);
  const critical = hud.oil < 0.2;
  const oilColor = hud.oil >= 0.6 ? 'var(--oil-high)' : critical ? 'var(--oil-critical)' : 'var(--oil-low)';
  const tallyTell = hud.tellKind === 'TALLY';

  // last three doors opened, as ruled ledger ticks
  const ticks: number[] = [];
  for (let d = Math.max(1, hud.door - 2); d <= hud.door; d++) ticks.push(d);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="false">
      {/* oil-critical pulse: 1 Hz on the fill only; the % numeral stays bone
          (brief §3). Reduced motion collapses --motion-pulse to 0ms, so the
          fill simply holds steady alarm red. */}
      <style>{`
        @keyframes hw-oil-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        .hw-oil-critical { animation: hw-oil-pulse var(--motion-pulse) linear infinite; }
      `}</style>

      {/* --- door log: top-left plate (always on, never animated) --- */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 'var(--hud-safe)',
          left: 'var(--hud-safe)',
          padding: 'var(--hud-plate-pad)',
          background: 'var(--color-plate-alpha)',
          border: 'var(--border-plate)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--color-ink)',
          minWidth: 'var(--hud-log-w)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          Door log
        </div>
        <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          NEXT <span aria-hidden="true">▸</span>{' '}
          <strong style={{ color: tallyTell ? 'var(--signal-tally)' : 'var(--color-ink)' }}>
            {pad2(hud.doorLog)}
          </strong>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-2)',
            borderTop: 'var(--border-hairline)',
            paddingTop: 'var(--space-2)',
          }}
        >
          {ticks.map((d) => (
            <span
              key={d}
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--color-ink-secondary)',
                borderRight: 'var(--border-hairline)',
                paddingRight: 'var(--space-2)',
              }}
            >
              {pad2(d)}
            </span>
          ))}
        </div>
        {/* checkpoint pips: six ruled marks, filled up to the live checkpoint */}
        <div
          style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}
          aria-label={`checkpoint door ${hud.checkpoint} of 24`}
        >
          {CHECKPOINT_DOORS.map((c) => (
            <span
              key={c}
              style={{
                width: '10px',
                height: '10px',
                background: hud.checkpoint >= c ? 'var(--color-ink)' : 'var(--color-plate-sunken)',
                border: 'var(--border-hairline)',
              }}
            />
          ))}
        </div>
      </div>

      {/* --- oil gauge: bottom-left vertical tube --- */}
      <div
        style={{
          position: 'absolute',
          left: 'var(--hud-safe)',
          bottom: 'var(--hud-safe)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-2)',
        }}
        aria-label={`lantern oil ${Math.round(hud.oil * 100)} percent`}
      >
        <div
          style={{
            position: 'relative',
            width: 'var(--hud-gauge-w)',
            height: 'var(--hud-gauge-h)',
            background: 'var(--oil-track)',
            border: 'var(--border-plate)',
          }}
        >
          <div
            className={critical ? 'hw-oil-critical' : undefined}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${Math.max(0, Math.min(1, hud.oil)) * 100}%`,
              background: oilColor,
              transition: 'height var(--motion-base) var(--ease-out)',
            }}
          />
          {/* ticks at 0.2 / 0.6 (brief §6) */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '20%', height: '1px', background: 'var(--oil-tick)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '60%', height: '1px', background: 'var(--oil-tick)' }} />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-ink)', // numeral never wears the alarm red
            background: 'var(--color-plate-alpha)',
            border: 'var(--border-plate)',
            padding: 'var(--space-1) var(--space-2)',
          }}
        >
          {Math.round(hud.oil * 100)}%
        </div>
      </div>

      {/* --- door numeral: bottom-right, Big Shoulders stencil --- */}
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
          color: tallyTell ? 'var(--signal-tally)' : 'var(--color-ink)',
        }}
        aria-label={`door ${hud.door}`}
      >
        {pad2(hud.door)}
      </div>

      {/* --- crosshair + tell indicator + interact prompt: center column --- */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'var(--hud-crosshair)',
          height: 'var(--hud-crosshair)',
        }}
        aria-hidden="true"
      >
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'var(--crosshair-ink)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--crosshair-ink)' }} />
      </div>

      {hud.tellKind && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 'calc(50% + var(--space-6))',
            transform: 'translateX(-50%)',
            opacity: hud.oil <= 0.2 ? 'var(--signal-suppressed)' : 1,
          }}
          aria-label={`${hud.tellKind} tell active`}
        >
          <TellGlyph kind={hud.tellKind} />
        </div>
      )}

      {hud.interactPrompt && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + var(--space-6))',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-label)',
            color: 'var(--color-ink)',
            background: 'var(--color-plate-alpha)',
            border: 'var(--border-plate)',
            padding: 'var(--space-1) var(--space-3)',
            whiteSpace: 'nowrap',
          }}
        >
          [E] {hud.interactPrompt}
        </div>
      )}
    </div>
  );
}
