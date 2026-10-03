import { useId, type Ref } from 'react';
import { LampDrawing } from '../../ui/ConceptDrawings';
import {
  cartTotals,
  formatItems,
  formatPrice,
  getSize,
  getVariant,
  lineTotalCents,
  type Cart,
  type VariantId,
} from './commerceModel';
import { QuantityStepper } from './QuantityStepper';

interface SampleCartProps {
  cart: Cart;
  /** Latest status message; `seq` changes on every announcement. */
  status: { text: string; seq: number };
  headingRef: Ref<HTMLHeadingElement>;
  /** Returns a ref callback that registers a line's Remove button for focus management. */
  removeRef: (id: VariantId) => Ref<HTMLButtonElement>;
  onRequestQty: (id: VariantId, qty: number) => void;
  onRemove: (id: VariantId) => void;
  /** Move focus back to the variant picker. */
  onChooseVariant: () => void;
}

export function SampleCart({ cart, status, headingRef, removeRef, onRequestQty, onRemove, onChooseVariant }: SampleCartProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const { items, subtotalCents } = cartTotals(cart);
  const empty = cart.length === 0;

  return (
    <aside className="cm-cart" aria-labelledby={headingId}>
      <div className="cm-cart__head">
        <h4 className="cm-cart__title" id={headingId} ref={headingRef} tabIndex={-1}>
          Sample cart
        </h4>
        <span className="cm-cart__count mono">
          <span key={items} className="value-pop">
            {formatItems(items)}
          </span>
        </span>
      </div>

      {/* Polite status: adds, quantity changes, limits and removals. A trailing
          no-break space alternates so a repeated message is still announced. */}
      <p className={`live-region cm-cart__status${status.text ? ' is-active' : ''}`} role="status">
        {status.text && (
          <span key={status.seq} className="cm-cart__status-text">
            {status.text}
            {status.seq % 2 === 1 ? ' ' : ''}
          </span>
        )}
      </p>

      {empty ? (
        <div className="empty-state cm-cart__empty">
          <strong>Your sample cart is empty</strong>
          <p>Choose a finish and size, then add the lamp to see line totals here.</p>
          <button type="button" className="btn btn--ghost" onClick={onChooseVariant}>
            Choose a variant
          </button>
        </div>
      ) : (
        <>
          <ul className="cm-cart__lines">
            {cart.map((line) => {
              const variant = getVariant(line.variantId);
              if (!variant) return null;
              const total = lineTotalCents(line);
              const qtyId = `${uid}-qty-${line.variantId}`;
              return (
                <li key={line.variantId} className="cm-line">
                  <span className="cm-line__thumb" aria-hidden="true">
                    <LampDrawing view="front" finish={variant.finish} scale={getSize(variant.size).scale} />
                  </span>
                  <div className="cm-line__info">
                    <p className="cm-line__name">{variant.name}</p>
                    <p className="cm-line__unit">
                      Sample price {formatPrice(variant.unitPriceCents)} each
                    </p>
                  </div>
                  <div className="cm-line__qty">
                    <label className="visually-hidden" htmlFor={qtyId}>
                      Quantity of {variant.name}
                    </label>
                    <QuantityStepper
                      id={qtyId}
                      compact
                      value={line.qty}
                      decreaseLabel={`Decrease quantity of ${variant.name}`}
                      increaseLabel={`Increase quantity of ${variant.name}`}
                      onRequest={(qty) => onRequestQty(line.variantId, qty)}
                    />
                  </div>
                  <p className="cm-line__total">
                    <span className="visually-hidden">Line total: </span>
                    <span key={total} className="value-pop">
                      {formatPrice(total)}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="btn btn--quiet cm-line__remove"
                    ref={removeRef(line.variantId)}
                    aria-label={`Remove ${variant.name} from sample cart`}
                    onClick={() => onRemove(line.variantId)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          <dl className="cm-cart__totals">
            <div className="cm-cart__total-row">
              <dt className="mono">Items</dt>
              <dd>
                <span key={items} className="value-pop">
                  {items}
                </span>
              </dd>
            </div>
            <div className="cm-cart__total-row cm-cart__total-row--subtotal">
              <dt className="mono">Subtotal · sample prices</dt>
              <dd>
                <span key={subtotalCents} className="value-pop">
                  {formatPrice(subtotalCents)}
                </span>
              </dd>
            </div>
          </dl>
        </>
      )}

      <p className="notice cm-cart__notice">Demo cart — there is no checkout, payment or delivery.</p>
    </aside>
  );
}
