// HALLWAKE — Wave 4 shop: the threshold keeper (features.md). MOTT keeps the
// thresholds at doors 8, 16 and 24: pass through and the corridor waits while
// you spend coins on kit. Everything here is pure table data + a pure buy
// reducer — the stock is authored per door, prices never move, no RNG. The
// loop calls buyOffer() on the sim state; the UI never mutates anything.

import type { ItemType, SimState } from './types';
import { INV_CAP } from './sim';

export interface ShopOffer {
  item: ItemType;
  price: number; // coins
}

// The vendor screens sit between rooms at every 8th door.
export const SHOP_DOORS: readonly number[] = [8, 16, 24];

export function isShopDoor(door: number): boolean {
  return SHOP_DOORS.includes(door);
}

// Deterministic stock per door. Prices climb deeper in (the purse only grows:
// authored coin piles total 26 coins by door 24, plus the hidden alcove's 6),
// and door 24's full bench is the last buy before the finale.
export const SHOP_STOCK: Record<number, readonly ShopOffer[]> = {
  8: [
    { item: 'TONIC', price: 4 },
    { item: 'FLASK', price: 3 },
    { item: 'PICK', price: 3 },
  ],
  16: [
    { item: 'WARD', price: 6 },
    { item: 'TONIC', price: 5 },
    { item: 'FLASK', price: 4 },
  ],
  24: [
    { item: 'WARD', price: 8 },
    { item: 'TONIC', price: 6 },
    { item: 'PICK', price: 4 },
    { item: 'FLASK', price: 5 },
  ],
};

export function shopStock(door: number): readonly ShopOffer[] {
  return SHOP_STOCK[door] ?? [];
}

// The live vendor screen: which threshold door it stands at, and which
// offer indices are already sold. Session state owned by the loop — the
// sim only ever sees pure buyOffer() results.
export interface ShopSession {
  door: number;
  sold: number[];
}

// Pure purchase: returns the new state with coins spent and the item pushed
// into the kit, or null when the purse is too light or the pack is full
// (the offer is then simply refused — state is never partially mutated).
export function buyOffer(state: SimState, offer: ShopOffer): SimState | null {
  if (state.coins < offer.price) return null;
  if (state.inv.length >= INV_CAP) return null;
  return {
    ...state,
    coins: state.coins - offer.price,
    inv: [...state.inv, offer.item],
  };
}

// The keeper's original name — never a borrowed one (ip-check gate).
export const KEEPER_NAME = 'MOTT';
