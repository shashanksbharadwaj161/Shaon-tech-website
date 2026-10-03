import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type Ref } from 'react';
import './commerce.css';
import {
  addToCart,
  clampQty,
  DEFAULT_FINISH,
  DEFAULT_SIZE,
  describeAdd,
  describeQuantityChange,
  describeRemove,
  EMPTY_CART,
  FINISHES,
  formatPrice,
  formatPriceDelta,
  getFinish,
  getSize,
  MAX_QTY,
  MIN_QTY,
  removeLine,
  setQuantity,
  SIZES,
  unitPriceCents,
  variantId,
  variantName,
  type Cart,
  type Finish,
  type Size,
  type VariantId,
} from './commerceModel';
import { LampGallery } from './LampGallery';
import { QuantityStepper } from './QuantityStepper';
import { SampleCart } from './SampleCart';

type FocusTarget = VariantId | 'heading';

const BASE_SIZE_CENTS = Math.min(...SIZES.map((s) => s.baseCents));

/**
 * Objects commerce — a fictional silver capsule lamp with finish / size
 * variants and an editable sample cart. Everything is in-memory sample data;
 * there is no checkout, payment or delivery.
 */
export function CommerceDemo() {
  const uid = useId();
  const titleId = `${uid}-title`;
  const pickerTitleId = `${uid}-picker`;
  const finishName = `${uid}-finish`;
  const sizeName = `${uid}-size`;
  const qtyId = `${uid}-qty`;
  const qtyHintId = `${uid}-qty-hint`;
  const summaryId = `${uid}-summary`;

  const [finish, setFinish] = useState<Finish>(DEFAULT_FINISH);
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);
  const [qty, setQty] = useState(MIN_QTY);
  // Bumped when the add quantity hits a limit, to replay a pop on the hint.
  const [qtyLimitHits, setQtyLimitHits] = useState(0);
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [status, setStatus] = useState({ text: '', seq: 0 });

  const pickerRef = useRef<HTMLFormElement>(null);
  const cartHeadingRef = useRef<HTMLHeadingElement>(null);
  const removeButtons = useRef(new Map<VariantId, HTMLButtonElement>());
  const pendingFocus = useRef<FocusTarget | null>(null);

  const selectedId = variantId(size, finish);
  const unit = unitPriceCents(selectedId);
  const sizeOption = getSize(size);
  const finishOption = getFinish(finish);

  const announce = (text: string) => setStatus((s) => ({ text, seq: s.seq + 1 }));

  // After a line is removed, move focus to its neighbour's Remove button, or to
  // the cart heading when the cart is now empty.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === 'heading') cartHeadingRef.current?.focus();
    else (removeButtons.current.get(target) ?? cartHeadingRef.current)?.focus();
  }, [cart]);

  const removeRef = useCallback(
    (id: VariantId): Ref<HTMLButtonElement> =>
      (el: HTMLButtonElement | null) => {
        if (!el) return undefined;
        removeButtons.current.set(id, el);
        return () => {
          if (removeButtons.current.get(id) === el) removeButtons.current.delete(id);
        };
      },
    [],
  );

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const after = addToCart(cart, selectedId, qty);
    setCart(after);
    announce(describeAdd(cart, after, selectedId, qty));
  };

  const handlePickerQty = (requested: number) => {
    const next = clampQty(requested);
    setQty(next);
    if (next !== requested) {
      setQtyLimitHits((n) => n + 1);
      announce(`Quantity to add is limited to ${MIN_QTY}–${MAX_QTY}.`);
    }
  };

  const handleLineQty = (id: VariantId, requested: number) => {
    const after = setQuantity(cart, id, requested);
    setCart(after);
    announce(describeQuantityChange(after, id, requested));
  };

  const handleRemove = (id: VariantId) => {
    const index = cart.findIndex((l) => l.variantId === id);
    if (index === -1) return;
    const neighbour = cart[index + 1] ?? cart[index - 1];
    pendingFocus.current = neighbour ? neighbour.variantId : 'heading';
    const after = removeLine(cart, id);
    setCart(after);
    announce(describeRemove(after, id));
  };

  const focusPicker = () => {
    pickerRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus();
  };

  return (
    <section className="cm theme-paper" aria-labelledby={titleId}>
      <header className="cm__head">
        <p className="cm__kicker mono">Fictional concept object</p>
        <h3 className="cm__title" id={titleId}>
          Capsule lamp
        </h3>
        <p className="cm__lead">
          A silver capsule over a slim disc base — invented for this studio concept to test variant choice and a cart
          whose totals are never ambiguous.
        </p>
        <p className="sample-label cm__sample">Sample prices · not for sale</p>
      </header>

      <div className="cm__layout">
        <LampGallery finish={finish} size={size} />

        <div className="cm__buy">
          <form ref={pickerRef} className="cm-picker" aria-labelledby={pickerTitleId} noValidate onSubmit={handleAdd}>
            <h4 className="visually-hidden" id={pickerTitleId}>
              Choose a variant
            </h4>

            <div className="cm-price">
              <span className="cm-price__label mono">Sample price · per lamp</span>
              <span className="cm-price__value">
                <span key={unit} className="value-pop">
                  {formatPrice(unit)}
                </span>
              </span>
              <span className="cm-price__variant">{variantName(selectedId)}</span>
            </div>

            <fieldset className="choices cm-group">
              <legend className="cm-group__legend">
                <span className="cm-group__index mono" aria-hidden="true">
                  01
                </span>
                Finish
              </legend>
              <p className="cm-group__meta mono" aria-hidden="true">
                Sample price effect
              </p>
              <div className="choices__grid cm-group__grid">
                {FINISHES.map((f) => (
                  <label key={f.id} className="choice cm-choice">
                    <input
                      type="radio"
                      name={finishName}
                      value={f.id}
                      checked={finish === f.id}
                      onChange={() => setFinish(f.id)}
                    />
                    <span className={`cm-swatch cm-swatch--${f.id}`} aria-hidden="true" />
                    <span className="choice__text">
                      {f.label}{' '}
                      <span className="choice__sub">{f.description}</span>
                    </span>
                    <span className="cm-choice__effect">
                      <span className="visually-hidden">Sample price: </span>
                      {formatPriceDelta(f.surchargeCents)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="choices cm-group">
              <legend className="cm-group__legend">
                <span className="cm-group__index mono" aria-hidden="true">
                  02
                </span>
                Size
              </legend>
              <p className="cm-group__meta mono" aria-hidden="true">
                Sample price effect
              </p>
              <div className="choices__grid cm-group__grid">
                {SIZES.map((s) => {
                  const delta = s.baseCents - BASE_SIZE_CENTS;
                  return (
                    <label key={s.id} className="choice cm-choice">
                      <input
                        type="radio"
                        name={sizeName}
                        value={s.id}
                        checked={size === s.id}
                        onChange={() => setSize(s.id)}
                      />
                      <span className={`cm-capsule cm-capsule--${s.id}`} aria-hidden="true" />
                      <span className="choice__text">
                        {s.label}{' '}
                        <span className="choice__sub">{s.description}</span>
                      </span>
                      <span className="cm-choice__effect">
                        <span className="visually-hidden">Sample price: </span>
                        {delta === 0 ? `Base ${formatPrice(s.baseCents)}` : formatPriceDelta(delta)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="cm-group cm-qty">
              <div className="cm-group__legend">
                <span className="cm-group__index mono" aria-hidden="true">
                  03
                </span>
                <label htmlFor={qtyId}>Quantity</label>
              </div>
              <QuantityStepper
                id={qtyId}
                value={qty}
                decreaseLabel="Decrease quantity"
                increaseLabel="Increase quantity"
                describedBy={qtyHintId}
                onRequest={handlePickerQty}
              />
              <p className="field__hint cm-qty__hint" id={qtyHintId}>
                <span key={qtyLimitHits} className={qtyLimitHits > 0 ? 'value-pop' : undefined}>
                  {MIN_QTY} to {MAX_QTY} per line. Adding the same variant again tops up its line.
                </span>
              </p>
            </div>

            <div className="cm-action">
              <p className="cm-action__summary" id={summaryId}>
                <span className="cm-action__label mono">Your selection</span>{' '}
                <span className="cm-action__text">
                  {qty} × {sizeOption.label} capsule lamp, {finishOption.label.toLowerCase()}.
                </span>{' '}
                <span className="cm-action__price">
                  Sample price {formatPrice(unit)} each
                  {qty > 1 ? ` — ${formatPrice(unit * qty)} for ${qty}` : ''}.
                </span>
              </p>
              <button type="submit" className="btn btn--primary cm-action__add" aria-describedby={summaryId}>
                Add to sample cart
              </button>
            </div>
          </form>

          <SampleCart
            cart={cart}
            status={status}
            headingRef={cartHeadingRef}
            removeRef={removeRef}
            onRequestQty={handleLineQty}
            onRemove={handleRemove}
            onChooseVariant={focusPicker}
          />
        </div>
      </div>
    </section>
  );
}
