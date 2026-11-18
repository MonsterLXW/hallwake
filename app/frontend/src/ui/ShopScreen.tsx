// HALLWAKE — Wave 4 vendor screen (features.md): MOTT, the threshold keeper,
// blocks doors 8, 16 and 24. The loop holds the corridor still while this is
// up (same contract as the perk plate); number keys buy, Enter moves on, and
// clicks work whenever the pointer is free. Stock and prices come from the
// deterministic core/shop table — the screen never invents an offer, and the
// purchase itself runs through the pure buyOffer() on the sim.

import { useEffect } from 'react';
import { useUIStore } from '../state/uiStore';
import { KEEPER_NAME, shopStock } from '../core/shop';
import { CoinGlyph, ItemGlyph } from './Hud';
import type { ItemType } from '../core/types';

const ITEM_LABEL: Record<ItemType, { name: string; blurb: string }> = {
  WARD: { name: 'Ward', blurb: 'Banishes the thing that kills you.' },
  TONIC: { name: 'Tonic', blurb: 'Talks one death out of the way.' },
  PICK: { name: 'Pick', blurb: 'Opens a locked exit.' },
  FLASK: { name: 'Flask', blurb: 'Forty-five seconds more lantern, drunk at once.' },
};

export default function ShopScreen({ onBuy, onClose }: { onBuy(i: number): void; onClose(): void }) {
  const shop = useUIStore((s) => s.hud.shop);
  const coins = useUIStore((s) => s.hud.coins);
  const packFull = useUIStore((s) => s.hud.inv.length >= 4);
  const perkPending = useUIStore((s) => s.hud.perkPending);
  const offers = shop ? shopStock(shop.door) : [];
  const sold = shop ? shop.sold : [];
  // Re-arm the key listener only when the session actually changes (the HUD
  // snapshot churns at 10 Hz with fresh array identities).
  const sessionKey = shop ? `${shop.door}|${sold.join(',')}|${coins}|${packFull}` : '';

  useEffect(() => {
    document.getElementById('hw-shop-0')?.focus();
    const onKey = (e: KeyboardEvent): void => {
      // While a perk pick is owed, the perk plate owns the number keys.
      if (perkPending) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const i = e.code.charCodeAt(5) - 49;
        if (i < offers.length) {
          e.preventDefault();
          onBuy(i);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, perkPending, onBuy, onClose]);

  if (!shop) return null;

  return (
    <div
      role="dialog"
      aria-label={`${KEEPER_NAME}, the threshold keeper at door ${shop.door}`}
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
          The threshold waits — door {String(shop.door).padStart(2, '0')}
        </p>
        <h2
          style={{
            margin: 'var(--space-1) 0 var(--space-2)',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'var(--text-lg)',
            lineHeight: 'var(--leading-tight)',
            letterSpacing: 'var(--tracking-stencil)',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
          }}
        >
          {KEEPER_NAME}, the keeper
        </h2>
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontFamily: 'var(--font-prose)',
            fontSize: 'var(--text-2xs)',
            lineHeight: 'var(--leading-prose)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          Counts your purse and says nothing. What you carry, you keep.
        </p>

        {offers.map((o, i) => {
          const isSold = sold.includes(i);
          const purseLight = coins < o.price;
          const blocked = isSold || purseLight || packFull;
          return (
            <button
              key={`${shop.door}-${o.item}`}
              id={`hw-shop-${i}`}
              type="button"
              disabled={blocked}
              onClick={() => onBuy(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderTop: 'var(--border-hairline)',
                padding: 'var(--space-3) var(--space-2)',
                cursor: blocked ? 'default' : 'pointer',
                color: 'var(--color-ink)',
                opacity: isSold ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!blocked) e.currentTarget.style.background = 'var(--color-accent-wash)';
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
              <ItemGlyph item={o.item} />
              <span style={{ display: 'block', flex: 1 }}>
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
                  {ITEM_LABEL[o.item].name}
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
                  {ITEM_LABEL[o.item].blurb}
                </span>
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 'var(--text-sm)',
                  color: isSold ? 'var(--color-ink-muted)' : purseLight || packFull ? 'var(--color-ink-muted)' : 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSold ? (
                  'sold'
                ) : packFull ? (
                  'pack full'
                ) : (
                  <>
                    {o.price} <CoinGlyph />
                    {purseLight ? ' · purse light' : ''}
                  </>
                )}
              </span>
            </button>
          );
        })}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
            borderTop: 'var(--border-hairline)',
            paddingTop: 'var(--space-2)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          <span>
            Keys 1-{offers.length} buy · [Enter] move on · the corridor waits
          </span>
          <span aria-label={`${coins} coins in purse`}>
            Purse <CoinGlyph /> {coins}
          </span>
        </div>
      </div>
    </div>
  );
}
