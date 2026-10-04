import { describe, expect, it } from 'vitest';
import {
  addToCart,
  cartTotals,
  clampQty,
  describeAdd,
  describeCart,
  describeQuantityChange,
  describeRemove,
  EMPTY_CART,
  FINISHES,
  focusAfterRemove,
  formatPrice,
  formatPriceDelta,
  lineQty,
  lineTotalCents,
  MAX_QTY,
  removeLine,
  setQuantity,
  SIZES,
  unitPriceCents,
  variantId,
  VARIANTS,
  type Cart,
  type VariantId,
} from './commerceModel';

/** Deep-freeze a cart so any attempted mutation throws in strict mode. */
function frozen(cart: Cart): Cart {
  return Object.freeze(cart.map((l) => Object.freeze({ ...l })));
}

describe('variants and sample prices', () => {
  it('builds one variant per size × finish with ids in the `${size}-${finish}` form', () => {
    expect(VARIANTS).toHaveLength(SIZES.length * FINISHES.length);
    expect(VARIANTS.map((v) => v.id).sort()).toEqual(
      ['large-brushed', 'large-polished', 'small-brushed', 'small-polished'],
    );
    expect(variantId('large', 'brushed')).toBe('large-brushed');
  });

  it('prices sizes at $160 / $220 with brushed adding $20', () => {
    expect(unitPriceCents('small-polished')).toBe(16000);
    expect(unitPriceCents('small-brushed')).toBe(18000);
    expect(unitPriceCents('large-polished')).toBe(22000);
    expect(unitPriceCents('large-brushed')).toBe(24000);
  });

  it('names variants in plain words', () => {
    expect(VARIANTS.find((v) => v.id === 'large-brushed')?.name).toBe('Large, Brushed silver');
  });

  it('uses the agreed option labels and drawing scales (Small 1, Large 1.22)', () => {
    expect(FINISHES.map((f) => [f.id, f.label])).toEqual([
      ['polished', 'Polished silver'],
      ['brushed', 'Brushed silver'],
    ]);
    expect(SIZES.map((s) => [s.id, s.label, s.scale])).toEqual([
      ['small', 'Small', 1],
      ['large', 'Large', 1.22],
    ]);
  });

  it('allows 1 to 10 of a variant per line', () => {
    expect(MAX_QTY).toBe(10);
    expect(clampQty(-1)).toBe(1);
  });

  it('refuses to price an unknown variant rather than returning a wrong number', () => {
    expect(() => unitPriceCents('medium-gold' as VariantId)).toThrow(RangeError);
  });
});

describe('addToCart', () => {
  it('adds a new variant as its own line', () => {
    const cart = addToCart(EMPTY_CART, 'small-polished', 2);
    expect(cart).toEqual([{ variantId: 'small-polished', qty: 2 }]);
  });

  it('merges the same variant into one line instead of duplicating it', () => {
    let cart = addToCart(EMPTY_CART, 'large-brushed', 1);
    cart = addToCart(cart, 'large-brushed', 3);
    expect(cart).toEqual([{ variantId: 'large-brushed', qty: 4 }]);
  });

  it('keeps different variants on separate lines in the order they were added', () => {
    let cart = addToCart(EMPTY_CART, 'large-brushed', 1);
    cart = addToCart(cart, 'small-polished', 1);
    cart = addToCart(cart, 'large-brushed', 1);
    expect(cart.map((l) => [l.variantId, l.qty])).toEqual([
      ['large-brushed', 2],
      ['small-polished', 1],
    ]);
  });

  it('caps a merged line at MAX_QTY', () => {
    let cart = addToCart(EMPTY_CART, 'small-brushed', 8);
    cart = addToCart(cart, 'small-brushed', 5);
    expect(lineQty(cart, 'small-brushed')).toBe(MAX_QTY);
  });

  it('caps a single oversized add at MAX_QTY', () => {
    expect(lineQty(addToCart(EMPTY_CART, 'small-polished', 25), 'small-polished')).toBe(MAX_QTY);
  });

  it('returns the same cart when the line is already full', () => {
    const full = addToCart(EMPTY_CART, 'small-polished', MAX_QTY);
    expect(addToCart(full, 'small-polished', 1)).toBe(full);
  });

  it('ignores unknown variant ids', () => {
    const cart = addToCart(EMPTY_CART, 'small-polished', 1);
    expect(addToCart(cart, 'medium-gold', 1)).toBe(cart);
    expect(addToCart(cart, '', 1)).toBe(cart);
  });

  it('ignores zero, negative, fractional-below-one and non-finite quantities', () => {
    const cart = addToCart(EMPTY_CART, 'small-polished', 1);
    expect(addToCart(cart, 'small-polished', 0)).toBe(cart);
    expect(addToCart(cart, 'large-polished', -3)).toBe(cart);
    expect(addToCart(cart, 'large-polished', 0.5)).toBe(cart);
    expect(addToCart(cart, 'large-polished', Number.NaN)).toBe(cart);
    expect(addToCart(cart, 'large-polished', Number.POSITIVE_INFINITY)).toBe(cart);
  });

  it('truncates fractional quantities to whole lamps', () => {
    expect(lineQty(addToCart(EMPTY_CART, 'small-polished', 2.9), 'small-polished')).toBe(2);
  });

  it('defaults to adding one', () => {
    expect(lineQty(addToCart(EMPTY_CART, 'large-polished'), 'large-polished')).toBe(1);
  });
});

describe('setQuantity', () => {
  const base = frozen([
    { variantId: 'small-polished', qty: 2 },
    { variantId: 'large-brushed', qty: 1 },
  ]);

  it('sets a line quantity without touching other lines', () => {
    const cart = setQuantity(base, 'large-brushed', 4);
    expect(cart).toEqual([
      { variantId: 'small-polished', qty: 2 },
      { variantId: 'large-brushed', qty: 4 },
    ]);
    expect(cart[0]).toBe(base[0]);
  });

  it('clamps at 1 — it never removes a line', () => {
    expect(lineQty(setQuantity(base, 'small-polished', 0), 'small-polished')).toBe(1);
    expect(lineQty(setQuantity(base, 'small-polished', -5), 'small-polished')).toBe(1);
  });

  it('clamps at MAX_QTY', () => {
    expect(lineQty(setQuantity(base, 'small-polished', MAX_QTY + 1), 'small-polished')).toBe(MAX_QTY);
    expect(lineQty(setQuantity(base, 'small-polished', 999), 'small-polished')).toBe(MAX_QTY);
  });

  it('is a no-op for a variant that has no line (even a valid one)', () => {
    expect(setQuantity(base, 'small-brushed', 3)).toBe(base);
    expect(setQuantity(base, 'medium-gold', 3)).toBe(base);
  });

  it('is a no-op for a non-numeric quantity or an unchanged one', () => {
    expect(setQuantity(base, 'small-polished', Number.NaN)).toBe(base);
    expect(setQuantity(base, 'small-polished', Number.POSITIVE_INFINITY)).toBe(base);
    expect(setQuantity(base, 'small-polished', 2)).toBe(base);
  });

  it('truncates a fractional quantity to whole lamps', () => {
    expect(lineQty(setQuantity(base, 'large-brushed', 3.9), 'large-brushed')).toBe(3);
    // 2.4 truncates to the current 2, so nothing changes.
    expect(setQuantity(base, 'small-polished', 2.4)).toBe(base);
  });
});

describe('removeLine', () => {
  const base = frozen([
    { variantId: 'small-polished', qty: 2 },
    { variantId: 'large-brushed', qty: 1 },
  ]);

  it('removes only the named line', () => {
    expect(removeLine(base, 'small-polished')).toEqual([{ variantId: 'large-brushed', qty: 1 }]);
  });

  it('returns the same cart when the variant has no line or is unknown', () => {
    expect(removeLine(base, 'small-brushed')).toBe(base);
    expect(removeLine(base, 'medium-gold')).toBe(base);
  });

  it('can empty the cart', () => {
    expect(removeLine(removeLine(base, 'small-polished'), 'large-brushed')).toEqual([]);
  });

  it('keeps the order of the remaining lines when a middle line goes', () => {
    const three = frozen([
      { variantId: 'small-polished', qty: 1 },
      { variantId: 'large-brushed', qty: 2 },
      { variantId: 'small-brushed', qty: 3 },
    ]);
    expect(removeLine(three, 'large-brushed').map((l) => l.variantId)).toEqual(['small-polished', 'small-brushed']);
  });
});

describe('focusAfterRemove', () => {
  const three = frozen([
    { variantId: 'small-polished', qty: 1 },
    { variantId: 'large-brushed', qty: 2 },
    { variantId: 'small-brushed', qty: 3 },
  ]);

  it('moves to the next line when there is one', () => {
    expect(focusAfterRemove(three, 'small-polished')).toBe('large-brushed');
    expect(focusAfterRemove(three, 'large-brushed')).toBe('small-brushed');
  });

  it('falls back to the previous line when the last line goes', () => {
    expect(focusAfterRemove(three, 'small-brushed')).toBe('large-brushed');
  });

  it('returns null when the cart will be empty (focus the cart heading)', () => {
    expect(focusAfterRemove([{ variantId: 'large-polished', qty: 1 }], 'large-polished')).toBeNull();
  });

  it('returns null for a variant that has no line', () => {
    expect(focusAfterRemove(three, 'large-polished')).toBeNull();
    expect(focusAfterRemove(EMPTY_CART, 'small-polished')).toBeNull();
  });

  it('always names a line that survives the removal', () => {
    for (const line of three) {
      const target = focusAfterRemove(three, line.variantId);
      expect(target).not.toBe(line.variantId);
      expect(removeLine(three, line.variantId).some((l) => l.variantId === target)).toBe(true);
    }
  });
});

describe('immutability', () => {
  it('never mutates the cart or its lines', () => {
    const base = frozen([
      { variantId: 'small-polished', qty: 2 },
      { variantId: 'large-brushed', qty: 1 },
    ]);
    const snapshot = JSON.stringify(base);
    // Frozen inputs throw on mutation in strict-mode ESM, so these calls prove no writes happen.
    const added = addToCart(base, 'small-polished', 3);
    const appended = addToCart(base, 'small-brushed', 1);
    const set = setQuantity(base, 'large-brushed', 7);
    const removed = removeLine(base, 'small-polished');
    expect(JSON.stringify(base)).toBe(snapshot);
    for (const next of [added, appended, set, removed]) expect(next).not.toBe(base);
  });

  it('leaves inputs untouched in the read-only helpers too', () => {
    const base = frozen([
      { variantId: 'small-polished', qty: 2 },
      { variantId: 'large-brushed', qty: 1 },
    ]);
    const snapshot = JSON.stringify(base);
    cartTotals(base);
    describeCart(base);
    focusAfterRemove(base, 'small-polished');
    describeAdd(base, addToCart(base, 'small-polished', 1), 'small-polished', 1);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe('cartTotals', () => {
  it('is zero for an empty cart', () => {
    expect(cartTotals(EMPTY_CART)).toEqual({ items: 0, subtotalCents: 0 });
  });

  it('is exact for a mixed cart: 2 × small-polished + 1 × large-brushed = $560', () => {
    let cart = addToCart(EMPTY_CART, 'small-polished', 2);
    cart = addToCart(cart, 'large-brushed', 1);
    expect(cartTotals(cart)).toEqual({ items: 3, subtotalCents: 56000 });
    expect(formatPrice(cartTotals(cart).subtotalCents)).toBe('$560');
  });

  it('stays exact with every variant at the maximum quantity', () => {
    const cart = VARIANTS.reduce<Cart>((c, v) => addToCart(c, v.id, MAX_QTY), EMPTY_CART);
    // (160 + 180 + 220 + 240) × 10 = $8,000
    expect(cartTotals(cart)).toEqual({ items: 40, subtotalCents: 800000 });
  });

  it('agrees with the sum of line totals', () => {
    const cart: Cart = [
      { variantId: 'small-brushed', qty: 3 },
      { variantId: 'large-polished', qty: 2 },
    ];
    expect(cart.map(lineTotalCents)).toEqual([54000, 44000]);
    expect(cartTotals(cart).subtotalCents).toBe(98000);
  });

  it('stays exact through a sequence of adds, edits and removals', () => {
    let cart = addToCart(EMPTY_CART, 'small-brushed', 2); // 2 × $180
    cart = addToCart(cart, 'large-polished', 1); // + 1 × $220
    cart = addToCart(cart, 'small-brushed', 1); // 3 × $180
    cart = setQuantity(cart, 'large-polished', 4); // 4 × $220
    cart = addToCart(cart, 'large-brushed', 9); // + 9 × $240
    cart = setQuantity(cart, 'large-brushed', 12); // clamped to 10 × $240
    cart = removeLine(cart, 'small-brushed');
    // 4 × 22000 + 10 × 24000 = 328000
    expect(cartTotals(cart)).toEqual({ items: 14, subtotalCents: 328000 });
    expect(formatPrice(cartTotals(cart).subtotalCents)).toBe('$3,280');
  });

  it('ignores lines whose variant is unknown', () => {
    const cart = [{ variantId: 'medium-gold', qty: 4 }] as unknown as Cart;
    expect(cartTotals(cart)).toEqual({ items: 0, subtotalCents: 0 });
  });
});

describe('clampQty', () => {
  it('truncates and clamps to 1..MAX_QTY, falling back to 1 for non-numbers', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(3.7)).toBe(3);
    expect(clampQty(MAX_QTY + 0.5)).toBe(MAX_QTY);
    expect(clampQty(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampQty(Number.NaN)).toBe(1);
  });
});

describe('formatPrice', () => {
  it('omits cents for whole dollars', () => {
    expect(formatPrice(18000)).toBe('$180');
    expect(formatPrice(0)).toBe('$0');
  });

  it('shows cents when they are non-zero', () => {
    expect(formatPrice(1999)).toBe('$19.99');
    expect(formatPrice(1050)).toBe('$10.50');
  });

  it('groups thousands', () => {
    expect(formatPrice(800000)).toBe('$8,000');
    expect(formatPrice(123405)).toBe('$1,234.05');
  });

  it('formats choice-card deltas', () => {
    expect(formatPriceDelta(2000)).toBe('+$20');
    expect(formatPriceDelta(6000)).toBe('+$60');
    expect(formatPriceDelta(0)).toBe('Included');
    expect(formatPriceDelta(-2000)).toBe('−$20');
  });
});

describe('status messages', () => {
  it('summarises the cart with correct pluralisation', () => {
    expect(describeCart(EMPTY_CART)).toBe('Sample cart is empty.');
    expect(describeCart([{ variantId: 'small-polished', qty: 1 }])).toBe('Sample cart: 1 item, $160.');
  });

  it('announces an add with the new totals', () => {
    const before: Cart = [{ variantId: 'small-brushed', qty: 2 }];
    const after = addToCart(before, 'large-brushed', 1);
    expect(describeAdd(before, after, 'large-brushed', 1)).toBe(
      'Added 1 × Large, Brushed silver. Sample cart: 3 items, $600.',
    );
  });

  it('says when an add was limited, reporting only what was actually added', () => {
    const before = addToCart(EMPTY_CART, 'small-polished', 8);
    const after = addToCart(before, 'small-polished', 5);
    expect(describeAdd(before, after, 'small-polished', 5)).toBe(
      'Added 2 × Small, Polished silver. The limit is 10 per line. Sample cart: 10 items, $1,600.',
    );
    expect(describeAdd(after, addToCart(after, 'small-polished', 1), 'small-polished', 1)).toMatch(
      /^Small, Polished silver is already at the limit of 10/,
    );
  });

  it('explains clamped quantity changes and removals', () => {
    const cart: Cart = [{ variantId: 'large-polished', qty: 1 }];
    expect(describeQuantityChange(setQuantity(cart, 'large-polished', 0), 'large-polished', 0)).toMatch(
      /minimum of 1\. Use Remove/,
    );
    expect(describeQuantityChange(setQuantity(cart, 'large-polished', 11), 'large-polished', 11)).toBe(
      'Large, Polished silver is limited to 10 per line. Sample cart: 10 items, $2,200.',
    );
    expect(describeQuantityChange(setQuantity(cart, 'large-polished', 3), 'large-polished', 3)).toBe(
      'Large, Polished silver: quantity 3. Sample cart: 3 items, $660.',
    );
    expect(describeRemove(removeLine(cart, 'large-polished'), 'large-polished')).toBe(
      'Removed Large, Polished silver. Sample cart is empty.',
    );
  });
});
