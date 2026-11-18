// HALLWAKE — the diegetic kit HUD (design-brief §6). This is the night
// porter's working kit: a stenciled door numeral, a ruled door log (the
// TALLY counterplay surface — always on, never animated), a brass oil tube,
// tell glyphs in entity signal colors, the Wave 1 kit strip (four slots,
// key numbers, bone glyphs — items are information, never signal hues), the
// coin purse line, and a mono interact prompt. Plates + hairlines, radius 0,
// no blur, no glow. Every value reads uiStore only; the sim is never touched
// from here.

import { useUIStore } from '../state/uiStore';
import { checkpointDoors, XP_LEVEL_THRESHOLDS } from '../core/progression';
import type { EntityKind, ItemType } from '../core/types';
import Minimap from './Minimap';

const pad2 = (n: number): string => String(n).padStart(2, '0');

// kit tallies for the slot count badges and the screen-reader summary
function itemCounts(inv: ItemType[]): Map<ItemType, number> {
  const m = new Map<ItemType, number>();
  for (const it of inv) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}
function kitSummary(inv: ItemType[]): string {
  if (!inv.length) return 'empty';
  return [...itemCounts(inv).entries()].map(([k, n]) => (n > 1 ? `${k} times ${n}` : k)).join(', ');
}

// Wave 1 kit glyphs: stroked bone marks drawn to the SAME silhouettes as the
// procedural canvas icons in render/textures.ts (skeleton key with ring bow
// and cut teeth; bandaged tonic bottle; corked round-bottom flask; eyeless
// ward charm), so the kit bar, the vendor, the [E] prompt and the 3D loot
// crate all speak one picture. Never color-alone — shape carries the meaning.
// Shared with the Wave 4 vendor screen (ShopScreen).
export function ItemGlyph({ item, size = 22 }: { item: ItemType; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="1.8"
      aria-hidden="true"
      style={{ display: 'block', width: `${size}px`, height: `${size}px` }}
    >
      {item === 'WARD' && (
        <g>
          <path d="M12 2 20 6v7c0 5-4 8-8 9-4-1-8-4-8-9V6Z" />
          <path d="M12 7v9M8.5 11h7M9.5 16h5" />
        </g>
      )}
      {item === 'TONIC' && (
        <g>
          <path d="M10 2h4M11 2v4.5L8 9v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9l-3-2.5V2" />
          <path d="M8 13h8M12 10.5v6" />
        </g>
      )}
      {item === 'PICK' && (
        <g>
          <circle cx="7.5" cy="7.5" r="4.5" />
          <path d="M10.5 10.5 21 21" />
          <path d="M16.5 16.5 14 19M19.5 19.5 17 22" />
        </g>
      )}
      {item === 'FLASK' && (
        <g>
          <path d="M9.5 2.5h5" />
          <path d="M11 2.5v6M13 2.5v6" />
          <circle cx="12" cy="15" r="6.5" />
        </g>
      )}
    </svg>
  );
}

// The porter's coin: disc + stamped square centre — same mark as the canvas
// COIN stencil. Used on the purse line and every shop price.
export function CoinGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="1.8"
      aria-hidden="true"
      style={{ display: 'inline-block', width: `${size}px`, height: `${size}px`, verticalAlign: '-3px' }}
    >
      <circle cx="12" cy="12" r="9" />
      <rect x="8.5" y="8.5" width="7" height="7" />
    </svg>
  );
}

// Tell glyphs (brief §6): GAUNT = tall slit, MURMUR = hollow ring,
// TALLY = four-stroke tally, CINDER = flame outline, STARE = eye with a
// slit pupil (Wave 2), GRIP = four dragging knuckles (Wave 2). Color is
// never the sole channel — each tell also carries its distinct glyph shape.
function TellGlyph({ kind }: { kind: EntityKind }) {
  const stroke =
    kind === 'GAUNT'
      ? 'var(--signal-gaunt)'
      : kind === 'TALLY'
        ? 'var(--signal-tally)'
        : kind === 'CINDER'
          ? 'var(--signal-cinder)'
          : kind === 'STARE'
            ? 'var(--signal-stare)'
            : kind === 'GRIP'
              ? 'var(--signal-grip)'
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
      {kind === 'STARE' && (
        <g>
          <path d="M2 14c4-6 8-9 12-9s8 3 12 9c-4 6-8 9-12 9s-8-3-12-9Z" />
          <circle cx="14" cy="14" r="4" />
          <path d="M14 11v6" />
        </g>
      )}
      {kind === 'GRIP' && (
        <g>
          <path d="M5 6c0 8 1 12 3 16M11 4c0 9 1 13 2 18M17 4c0 9 0 13-1 18M23 6c0 8-1 12-3 16" />
          <path d="M4 24h20" />
        </g>
      )}
    </svg>
  );
}

export default function Hud() {
  const hud = useUIStore((s) => s.hud);
  const critical = hud.oil < 0.2;
  const oilColor = hud.oil >= 0.6 ? 'var(--oil-high)' : critical ? 'var(--oil-critical)' : 'var(--oil-low)';
  const tallyTell = hud.tellKind === 'TALLY';
  const kitCounts = itemCounts(hud.inv);

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
        {/* checkpoint pips: ruled marks for this difficulty's spacing,
            filled up to the live checkpoint */}
        <div
          style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}
          aria-label={`checkpoint door ${hud.checkpoint} of 24, ${hud.difficulty} difficulty`}
        >
          {checkpointDoors(hud.difficulty).map((c) => (
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
        {/* Wave 1: the coin purse, ruled under the log */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-2)',
            borderTop: 'var(--border-hairline)',
            paddingTop: 'var(--space-2)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          <span>Purse</span>
          <span style={{ color: 'var(--color-ink)' }} aria-label={`${hud.coins} coins`}>
            <CoinGlyph /> {hud.coins}
          </span>
        </div>
        {/* Wave 3: XP ledger — the numeral plus three level pips (one per
            perk pick); the perk names themselves live on the level-up plate */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-2)',
            borderTop: 'var(--border-hairline)',
            paddingTop: 'var(--space-2)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
          aria-label={`xp ${hud.xp}, level ${hud.level} of ${XP_LEVEL_THRESHOLDS.length}`}
        >
          <span>Xp</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-ink)' }}>{hud.xp}</span>
            <span style={{ display: 'flex', gap: 'var(--space-1)' }} aria-hidden="true">
              {XP_LEVEL_THRESHOLDS.map((t, i) => (
                <span
                  key={t}
                  style={{
                    width: '10px',
                    height: '10px',
                    background: hud.level > i ? 'var(--color-ink)' : 'var(--color-plate-sunken)',
                    border: 'var(--border-hairline)',
                  }}
                />
              ))}
            </span>
          </span>
        </div>
      </div>

      {/* Wave 4: the minimap plate — top-right, opposite the door log */}
      <Minimap />

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
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
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
          {/* item art pass: when a PICK in the kit will open this exit, the
              key icon rides the prompt — the door says "key works here" */}
          {hud.pickOpens && hud.interactPrompt.startsWith('OPEN') && <ItemGlyph item="PICK" size={18} />}
          <span>
            [E] {hud.interactPrompt}
          </span>
        </div>
      )}

      {/* Wave 2: STARE peripheral warning — the view is inside the eye's
          cone right now. Left-center plate (a true peripheral slot, clear of
          the center glyph/prompt stack); jade is STARE's channel, and the
          words carry the meaning without color. */}
      {hud.stareAt && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            left: 'var(--hud-safe)',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--signal-stare)',
            background: 'var(--color-plate-alpha)',
            border: 'var(--border-plate)',
            borderLeft: '2px solid var(--signal-stare)',
            padding: 'var(--space-2) var(--space-3)',
            whiteSpace: 'nowrap',
          }}
        >
          Look away
        </div>
      )}

      {/* Wave 1: hidden state — the closet slit is the whole world now */}
      {hud.hidden && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% - var(--space-7))',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-secondary)',
            background: 'var(--color-plate-alpha)',
            border: 'var(--border-plate)',
            padding: 'var(--space-1) var(--space-3)',
            whiteSpace: 'nowrap',
          }}
        >
          Hidden — [E] to step out
        </div>
      )}

      {/* Item art pass: kit strip — four ruled slots. Each occupied slot is
          the item's icon (not a number) plus a count badge when the pack
          carries duplicates; an empty slot is a dim outlined well. The key
          number stays as a tiny corner label for the keyboard affordance. */}
      <div
        role="status"
        aria-label={`kit: ${kitSummary(hud.inv)}`}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'var(--hud-safe)',
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'var(--color-plate-alpha)',
          border: 'var(--border-plate)',
        }}
      >
        {[0, 1, 2, 3].map((slot) => {
          const item = hud.inv[slot];
          const count = item ? kitCounts.get(item) ?? 1 : 1;
          return (
            <div
              key={slot}
              aria-label={item ? `slot ${slot + 1}: ${item}${count > 1 ? ` times ${count}` : ''}` : `slot ${slot + 1}: empty`}
              style={{
                width: 'var(--hud-row-h)',
                height: 'var(--hud-row-h)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderRight: slot < 3 ? 'var(--border-hairline)' : 'none',
                opacity: item ? 1 : 0.35,
              }}
            >
              {item ? (
                <ItemGlyph item={item} />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: '22px',
                    height: '22px',
                    border: '1px solid var(--color-rule-strong)',
                  }}
                />
              )}
              {item && count > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--color-ink-secondary)',
                  }}
                >
                  ×{count}
                </span>
              )}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {slot + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
