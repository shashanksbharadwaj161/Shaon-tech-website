import { useState, type KeyboardEvent } from 'react';
import { MAX_QTY, MIN_QTY } from './commerceModel';

interface QuantityStepperProps {
  /** id of the number input (pair it with a <label htmlFor>). */
  id: string;
  value: number;
  /** Accessible names for the − / + buttons. */
  decreaseLabel: string;
  increaseLabel: string;
  /**
   * Called with the requested quantity. It may be outside MIN_QTY..MAX_QTY:
   * the owner clamps it and explains the limit, so the stepper stays dumb.
   */
  onRequest: (qty: number) => void;
  describedBy?: string;
  compact?: boolean;
}

/**
 * − / number / + stepper. The bound buttons stay focusable (aria-disabled) so
 * focus is never lost when a limit is reached; pressing one still reports the
 * request so the owner can announce why nothing changed.
 */
export function QuantityStepper({ id, value, decreaseLabel, increaseLabel, onRequest, describedBy, compact }: QuantityStepperProps) {
  // Raw text while the visitor is typing; null shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    const trimmed = draft.trim();
    const n = Number(trimmed);
    // Empty or unreadable input reverts to the current value.
    if (trimmed === '' || !Number.isFinite(n)) return;
    const whole = Math.trunc(n);
    if (whole !== value) onRequest(whole);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Commit the typed value instead of submitting the surrounding form.
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Escape' && draft !== null) {
      setDraft(null);
    }
  };

  const step = (delta: number) => {
    setDraft(null);
    onRequest(value + delta);
  };

  const atMin = value <= MIN_QTY;
  const atMax = value >= MAX_QTY;

  return (
    <div className={['cm-stepper', compact && 'cm-stepper--compact'].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="cm-stepper__btn"
        aria-label={decreaseLabel}
        aria-disabled={atMin || undefined}
        onClick={() => step(-1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        id={id}
        className="cm-stepper__input"
        type="number"
        inputMode="numeric"
        min={MIN_QTY}
        max={MAX_QTY}
        step={1}
        value={draft ?? String(value)}
        aria-describedby={describedBy}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const n = Number(raw);
          // In-range whole numbers apply immediately so totals follow typing;
          // anything else waits for blur / Enter, where it is clamped and explained.
          if (raw.trim() !== '' && Number.isInteger(n) && n >= MIN_QTY && n <= MAX_QTY && n !== value) onRequest(n);
        }}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="cm-stepper__btn"
        aria-label={increaseLabel}
        aria-disabled={atMax || undefined}
        onClick={() => step(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
