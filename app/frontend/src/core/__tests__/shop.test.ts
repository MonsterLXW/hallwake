// HALLWAKE — Wave 4 shop gate: the keeper's stock is a fixed table at doors
// 8/16/24, and buyOffer is a pure purchase — coins down, item in the kit, or
// a clean null refusal (light purse / full pack) that never touches state.

import { describe, expect, it } from 'vitest';
import { makeRoomState } from '../sim';
import { SHOP_DOORS, SHOP_STOCK, buyOffer, isShopDoor, shopStock } from '../shop';
import type { SimState } from '../types';

describe('shop table (deterministic stock per door)', () => {
  it('keepers stand at doors 8, 16 and 24 only', () => {
    expect([...SHOP_DOORS]).toEqual([8, 16, 24]);
    expect(isShopDoor(8)).toBe(true);
    expect(isShopDoor(16)).toBe(true);
    expect(isShopDoor(24)).toBe(true);
    expect(isShopDoor(9)).toBe(false);
    expect(shopStock(9)).toEqual([]);
  });

  it('every keeper stocks kit items at fixed positive prices, and the table never moves', () => {
    for (const door of SHOP_DOORS) {
      const stock = shopStock(door);
      expect(stock.length, `door ${door} stock`).toBeGreaterThanOrEqual(3);
      for (const o of stock) {
        expect(['WARD', 'TONIC', 'PICK', 'FLASK']).toContain(o.item);
        expect(o.price).toBeGreaterThan(0);
      }
    }
    expect(SHOP_STOCK[8]).toEqual(shopStock(8));
    expect(SHOP_STOCK[24]).toEqual(shopStock(24));
  });
});

describe('buyOffer (pure purchase)', () => {
  it('decrements the purse and pushes the item into the kit; the input state is untouched', () => {
    const s: SimState = { ...makeRoomState(8, 1), coins: 9 };
    const next = buyOffer(s, { item: 'WARD', price: 6 });
    expect(next).not.toBeNull();
    expect(next!.coins).toBe(3);
    expect(next!.inv).toEqual(['WARD']);
    expect(s.coins).toBe(9); // purity: the caller's state never mutates
    expect(s.inv).toEqual([]);
  });

  it('rejects a light purse: null, state untouched', () => {
    const s: SimState = { ...makeRoomState(8, 1), coins: 2 };
    expect(buyOffer(s, { item: 'WARD', price: 6 })).toBeNull();
    expect(s.coins).toBe(2);
  });

  it('rejects a full pack (cap 4): null, state untouched', () => {
    const s: SimState = { ...makeRoomState(8, 1), coins: 99, inv: ['WARD', 'TONIC', 'PICK', 'FLASK'] };
    expect(buyOffer(s, { item: 'TONIC', price: 4 })).toBeNull();
    expect(s.coins).toBe(99);
    expect(s.inv).toHaveLength(4);
  });

  it('deterministic: the same purchase on the same state yields identical state', () => {
    const s: SimState = { ...makeRoomState(24, 1), coins: 20 };
    const a = buyOffer(s, { item: 'PICK', price: 4 });
    const b = buyOffer(s, { item: 'PICK', price: 4 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
