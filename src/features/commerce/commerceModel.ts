/**
 * Objects commerce — pure model for the fictional capsule lamp.
 *
 * Everything here is sample data for a studio concept: the object is fictional
 * and every price is a sample price. Money is held in integer US cents so cart
 * totals are always exact; formatting happens only at the edge.
 *
 * All functions are pure and never mutate their inputs. When an operation has
 * no effect, the original cart is returned unchanged (same reference), so a UI
 * can skip work cheaply.
 */

export type Finish = 'polished' | 'brushed';
export type Size = 'small' | 'large';
export type VariantId = `${Size}-${Finish}`;

export interface FinishOption {
  readonly id: Finish;
  readonly label: string;
  /** Short description of the surface. */
  readonly description: string;
  /** Sample surcharge added to the size's base price, in cents. */
  readonly surchargeCents: number;
}

export interface SizeOption {
  readonly id: Size;
  readonly label: string;
  readonly description: string;
  /** Sample base price, in cents. */
  readonly baseCents: number;
  /** Drawing scale for the code-native views (1 = standard). */
  readonly scale: number;
}

export interface Variant {
  readonly id: VariantId;
  readonly size: Size;
  readonly finish: Finish;
  /** Plain-words name, e.g. "Large, Brushed silver". */
  readonly name: string;
  readonly unitPriceCents: number;
}

export interface CartLine {
  readonly variantId: VariantId;
  readonly qty: number;
}

export type Cart = readonly CartLine[];

export interface CartTotals {
  /** Total number of lamps across all lines. */
  readonly items: number;
  readonly subtotalCents: number;
}

/** Smallest quantity a line (or an add) can hold. */
export const MIN_QTY = 1;
/** Largest quantity a single line can hold in this demo. */
export const MAX_QTY = 10;

export const FINISHES: readonly FinishOption[] = [
  { id: 'polished', label: 'Polished silver', description: 'Mirror-bright surface', surchargeCents: 0 },
  { id: 'brushed', label: 'Brushed silver', description: 'Soft satin grain', surchargeCents: 2000 },
];

export const SIZES: readonly SizeOption[] = [
  { id: 'small', label: 'Small', description: 'Desk height', baseCents: 16000, scale: 1 },
  { id: 'large', label: 'Large', description: 'Side-table height', baseCents: 22000, scale: 1.22 },
];

export const DEFAULT_FINISH: Finish = 'polished';
export const DEFAULT_SIZE: Size = 'small';

export const EMPTY_CART: Cart = [];

export function variantId(size: Size, finish: Finish): VariantId {
  return `${size}-${finish}`;
}

export const VARIANTS: readonly Variant[] = SIZES.flatMap((size) =>
  FINISHES.map(
    (finish): Variant => ({
      id: variantId(size.id, finish.id),
      size: size.id,
      finish: finish.id,
      name: `${size.label}, ${finish.label}`,
      unitPriceCents: size.baseCents + finish.surchargeCents,
    }),
  ),
);

const VARIANT_BY_ID: ReadonlyMap<string, Variant> = new Map(VARIANTS.map((v) => [v.id, v]));

export function isVariantId(value: string): value is VariantId {
  return VARIANT_BY_ID.has(value);
}

export function getVariant(id: string): Variant | undefined {
  return VARIANT_BY_ID.get(id);
}

export function getFinish(id: Finish): FinishOption {
  return FINISHES.find((f) => f.id === id) ?? FINISHES[0]!;
}

export function getSize(id: Size): SizeOption {
  return SIZES.find((s) => s.id === id) ?? SIZES[0]!;
}

/** Sample unit price in cents. Throws for an id that is not a known variant. */
export function unitPriceCents(id: VariantId): number {
  const v = VARIANT_BY_ID.get(id);
  if (!v) throw new RangeError(`Unknown variant: ${String(id)}`);
  return v.unitPriceCents;
}

/** Plain-words variant name, e.g. "Large, Brushed silver". */
export function variantName(id: VariantId): string {
  return VARIANT_BY_ID.get(id)?.name ?? String(id);
}

/**
 * Clamp a requested quantity to MIN_QTY..MAX_QTY. Fractions are truncated;
 * a value that is not a finite number falls back to MIN_QTY.
 */
export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(qty)));
}

/** Quantity of a variant currently in the cart (0 when it has no line). */
export function lineQty(cart: Cart, id: string): number {
  return cart.find((l) => l.variantId === id)?.qty ?? 0;
}

/**
 * Add `qty` of a variant. The same variant always shares one line: adding it
 * again raises that line's quantity, capped at MAX_QTY. New variants are
 * appended as a new line. Unknown variant ids, and quantities that are not a
 * finite number of at least 1, leave the cart unchanged.
 */
export function addToCart(cart: Cart, id: string, qty = 1): Cart {
  if (!isVariantId(id) || !Number.isFinite(qty) || qty < MIN_QTY) return cart;
  const amount = Math.trunc(qty);
  const index = cart.findIndex((l) => l.variantId === id);
  if (index === -1) return [...cart, { variantId: id, qty: clampQty(amount) }];
  const current = cart[index]!;
  const nextQty = clampQty(current.qty + amount);
  if (nextQty === current.qty) return cart;
  return cart.map((l, i) => (i === index ? { ...l, qty: nextQty } : l));
}

/**
 * Set a line's quantity, clamped to MIN_QTY..MAX_QTY (removing a line is a
 * separate, explicit action). A variant that has no line, or a quantity that
 * is not a finite number, leaves the cart unchanged.
 */
export function setQuantity(cart: Cart, id: string, qty: number): Cart {
  if (!Number.isFinite(qty)) return cart;
  const index = cart.findIndex((l) => l.variantId === id);
  if (index === -1) return cart;
  const nextQty = clampQty(qty);
  if (nextQty === cart[index]!.qty) return cart;
  return cart.map((l, i) => (i === index ? { ...l, qty: nextQty } : l));
}

/** Remove a variant's line. Removing a variant that has no line is a no-op. */
export function removeLine(cart: Cart, id: string): Cart {
  return cart.some((l) => l.variantId === id) ? cart.filter((l) => l.variantId !== id) : cart;
}

export function lineTotalCents(line: CartLine): number {
  return unitPriceCents(line.variantId) * line.qty;
}

/** Exact item count and subtotal (integer cents). Lines with unknown ids are ignored. */
export function cartTotals(cart: Cart): CartTotals {
  let items = 0;
  let subtotalCents = 0;
  for (const line of cart) {
    const v = VARIANT_BY_ID.get(line.variantId);
    if (!v) continue;
    items += line.qty;
    subtotalCents += v.unitPriceCents * line.qty;
  }
  return { items, subtotalCents };
}

const WHOLE_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const WITH_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$180" for whole dollars, "$19.99" when there are cents. */
export function formatPrice(cents: number): string {
  const whole = Number.isInteger(cents) && cents % 100 === 0;
  return (whole ? WHOLE_DOLLARS : WITH_CENTS).format(cents / 100);
}

/** A price difference for a choice card: "+$20", or "Included" when zero. */
export function formatPriceDelta(cents: number): string {
  if (cents === 0) return 'Included';
  return `${cents > 0 ? '+' : '−'}${formatPrice(Math.abs(cents))}`;
}

export function formatItems(items: number): string {
  return `${items} ${items === 1 ? 'item' : 'items'}`;
}

// ---------- Status messages (announced politely and shown in the cart) ----------

/** "Sample cart: 3 items, $640." or "Sample cart is empty." */
export function describeCart(cart: Cart): string {
  const { items, subtotalCents } = cartTotals(cart);
  return items === 0 ? 'Sample cart is empty.' : `Sample cart: ${formatItems(items)}, ${formatPrice(subtotalCents)}.`;
}

/** Message after trying to add `requested` of a variant, given the carts before and after. */
export function describeAdd(before: Cart, after: Cart, id: VariantId, requested: number): string {
  const name = variantName(id);
  const added = lineQty(after, id) - lineQty(before, id);
  if (added <= 0) return `${name} is already at the limit of ${MAX_QTY} in the sample cart. ${describeCart(after)}`;
  const limited = added < requested ? ` The limit is ${MAX_QTY} per line.` : '';
  return `Added ${added} × ${name}.${limited} ${describeCart(after)}`;
}

/** Message after asking for a line quantity of `requested`. */
export function describeQuantityChange(after: Cart, id: VariantId, requested: number): string {
  const name = variantName(id);
  if (requested < MIN_QTY) return `${name} is at the minimum of ${MIN_QTY}. Use Remove to take it out. ${describeCart(after)}`;
  if (requested > MAX_QTY) return `${name} is limited to ${MAX_QTY} per line. ${describeCart(after)}`;
  return `${name}: quantity ${lineQty(after, id)}. ${describeCart(after)}`;
}

export function describeRemove(after: Cart, id: VariantId): string {
  return `Removed ${variantName(id)}. ${describeCart(after)}`;
}
