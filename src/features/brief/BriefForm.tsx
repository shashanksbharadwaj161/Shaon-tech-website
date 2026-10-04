/**
 * Project brief — three steps, validated in place, downloaded as a local file.
 *
 * Nothing is sent anywhere. Answers live in memory (briefStore) so they
 * survive leaving the page and coming back within the same visit; a reload
 * clears them. The only output is a JSON or text file the visitor's own
 * browser saves.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { buildBriefFile, buildBriefText, downloadFile, localIsoTimestamp, type ExportFormat } from './briefExport';
import {
  BUDGET_HINT,
  CURRENCIES,
  DETAILS_TITLE,
  FIELD_LABELS,
  GOALS_MAX,
  NOT_PROVIDED,
  PROJECT_TYPES,
  STEPS,
  TIMINGS,
  budgetOptions,
  characterCount,
  firstInvalidField,
  hasErrors,
  revalidateErrors,
  reviewGroups,
  setCurrency,
  validateStep,
  type BriefData,
  type BriefField,
  type Currency,
  type FieldErrors,
  type Option,
  type ProjectType,
  type Step,
} from './briefModel';
import { getBriefState, resetBriefState, setBriefStep, updateBriefData, useBriefState } from './briefStore';
import './brief.css';

const DELIVERY_NOTICE = 'Contact delivery is not connected yet. Download your brief to keep a copy.';
/** How long "Confirm start over" stays armed before it quietly reverts. */
const CONFIRM_WINDOW_MS = 6000;

const PROJECT_TYPE_NOTES: Readonly<Record<ProjectType, string>> = {
  website: 'A marketing site, portfolio or online shop',
  app: 'For phones, tablets or the browser',
  both: 'A site with a companion app',
  unsure: 'Describe the idea; the format can come later',
};

const formatCount = (n: number) => n.toLocaleString('en-US');

function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(' ');
  return list === '' ? undefined : list;
}

/** Smooth scrolling only when the visitor has motion on (the site sets these on <html>). */
function scrollBehavior(): ScrollBehavior {
  const { motion, paused } = document.documentElement.dataset;
  if (motion === 'reduced' || paused === 'true') return 'auto';
  if (motion === undefined && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'auto';
  return 'smooth';
}

/** Height of the fixed glass header, so focused content is never hidden beneath it. */
function headerOffset(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  return Number.isFinite(value) ? value : 64;
}

type ExportStatus = { readonly kind: 'requested' | 'copied' | 'error'; readonly text: string; readonly id: number };

export function BriefForm({ onStepChange }: { onStepChange?: (step: 1 | 2 | 3) => void }) {
  const { step, data } = useBriefState();
  const baseId = useId();
  const id = (name: string) => `${baseId}${name}`;
  const fieldId = (field: BriefField) => id(`field-${field}`);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 });
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [rangeCleared, setRangeCleared] = useState<{ from: Currency; to: Currency } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [previewAt, setPreviewAt] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Report the visible step on mount and whenever it changes, without
  // re-firing when the parent passes a new callback identity.
  const onStepChangeRef = useRef(onStepChange);
  useLayoutEffect(() => {
    onStepChangeRef.current = onStepChange;
  });
  useEffect(() => {
    onStepChangeRef.current?.(step);
  }, [step]);

  useEffect(() => {
    if (!confirmingReset) return undefined;
    const timer = window.setTimeout(() => setConfirmingReset(false), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [confirmingReset]);

  const announce = (text: string) => setAnnouncement((previous) => ({ text, id: previous.id + 1 }));
  const showExportStatus = (kind: ExportStatus['kind'], text: string) =>
    setExportStatus((previous) => ({ kind, text, id: (previous?.id ?? 0) + 1 }));

  /** Focus the new step's heading; scroll the form into view only if the heading is off-screen or under the header. */
  function revealStep() {
    const heading = headingRef.current;
    const root = rootRef.current;
    if (heading === null || root === null) return;
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < headerOffset() + 8 || rect.bottom > window.innerHeight - 8) {
      root.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }
  }

  /** Focus a field (for a radio group: its checked option, else the first) and centre it on screen. */
  function focusField(field: BriefField) {
    const element = document.getElementById(fieldId(field));
    if (element === null) return;
    const control =
      element instanceof HTMLFieldSetElement
        ? (element.querySelector<HTMLInputElement>('input:checked') ?? element.querySelector<HTMLInputElement>('input'))
        : element;
    if (control === null) return;
    control.focus({ preventScroll: true });
    (element.closest<HTMLElement>('[data-bf-field]') ?? element).scrollIntoView({
      block: 'center',
      behavior: scrollBehavior(),
    });
  }

  /** Render errors first (so the focused control is already described by its message), then focus the first. */
  function showErrors(onStep: Step, found: FieldErrors) {
    flushSync(() => setErrors(found));
    const count = Object.keys(found).length;
    if (count > 1) announce(`${count} answers need attention.`);
    const first = firstInvalidField(onStep, found);
    if (first !== null) focusField(first);
  }

  function goTo(next: Step) {
    flushSync(() => {
      setErrors({});
      setRangeCleared(null);
      setExportStatus(null);
      setConfirmingReset(false);
      setPreviewAt(null);
      setBriefStep(next);
    });
    revealStep();
  }

  /** Apply an edit; any error already showing on this step is re-checked so it clears as soon as it is fixed. */
  function change(update: (current: BriefData) => BriefData) {
    const before = getBriefState();
    const next = update(before.data);
    if (next === before.data) return;
    updateBriefData(() => next);
    setErrors((previous) => (hasErrors(previous) ? revalidateErrors(previous, before.step, next) : previous));
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = getBriefState();
    const found = validateStep(current.step, current.data);
    if (hasErrors(found)) {
      showErrors(current.step, found);
      return;
    }
    goTo(current.step === 1 ? 2 : 3);
  }

  function handleGoals(value: string) {
    const wasOver = characterCount(getBriefState().data.goals) > GOALS_MAX;
    change((current) => ({ ...current, goals: value }));
    const isOver = characterCount(value) > GOALS_MAX;
    if (isOver !== wasOver) {
      announce(
        isOver
          ? `Over the ${formatCount(GOALS_MAX)}-character limit.`
          : `Within the ${formatCount(GOALS_MAX)}-character limit again.`,
      );
    }
  }

  function handleCurrency(currency: Currency) {
    const before = getBriefState().data;
    const next = setCurrency(before, currency);
    change(() => next);
    if (before.budgetRange !== null && next.budgetRange === null) {
      setRangeCleared({ from: before.currency, to: currency });
      announce(`Budget ranges now in ${currency}. Your ${before.currency} range was cleared.`);
    } else {
      setRangeCleared(null);
      announce(`Budget ranges now in ${currency}.`);
    }
  }

  /** Review "Edit": your details are on this same step, so focus them; other groups go back to their step. */
  function handleEdit(target: Step) {
    if (target === 3) {
      focusField('name');
      return;
    }
    goTo(target);
  }

  function handleDownload(format: ExportFormat) {
    const { data: current } = getBriefState();
    // Step 1 is always valid by the time step 3 is reachable; checked again defensively.
    const projectErrors = validateStep(1, current);
    if (hasErrors(projectErrors)) {
      goTo(1);
      showErrors(1, projectErrors);
      return;
    }
    const detailErrors = validateStep(3, current);
    if (hasErrors(detailErrors)) {
      setExportStatus(null);
      showErrors(3, detailErrors);
      return;
    }
    const file = buildBriefFile(format, current, localIsoTimestamp(new Date()));
    try {
      downloadFile(file.filename, file.content, file.mime);
      // The page can only ask the browser to save; it cannot confirm the save
      // happened (a browser or setting may block it silently).
      showExportStatus(
        'requested',
        `Download requested: ${file.filename}. If your browser did not save it, open “Preview the text file” below to copy your brief.`,
      );
    } catch {
      showExportStatus(
        'error',
        'This browser did not allow the download. Open “Preview the text file” below to copy your brief instead.',
      );
    }
  }

  async function handleCopy() {
    const text = buildBriefText(getBriefState().data, previewAt ?? localIsoTimestamp(new Date()));
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      showExportStatus('copied', 'Copied the brief text to your clipboard.');
    } catch {
      showExportStatus('error', 'Copying is not available here. Select the preview text and copy it instead.');
    }
  }

  function handleStartOver() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      announce('Press “Confirm start over” to clear every answer, or Escape to keep them.');
      return;
    }
    flushSync(() => {
      setConfirmingReset(false);
      setErrors({});
      setRangeCleared(null);
      setExportStatus(null);
      setPreviewAt(null);
      resetBriefState();
    });
    announce('Brief cleared. You are back at step 1.');
    revealStep();
  }

  function handleStartOverKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && confirmingReset) {
      event.preventDefault();
      event.stopPropagation();
      setConfirmingReset(false);
      announce('Start over cancelled. Your answers are kept.');
    }
  }

  const meta = STEPS[step - 1];
  const goalsCount = characterCount(data.goals);
  const goalsOver = goalsCount > GOALS_MAX;

  function renderProjectStep() {
    const hintId = id('goals-hint');
    const countId = id('goals-count');
    const errorId = id('goals-error');
    return (
      <form className="bf-form" noValidate onSubmit={handleContinue}>
        <RadioGroup
          id={fieldId('projectType')}
          name={id('project-type')}
          legend={FIELD_LABELS.projectType}
          options={PROJECT_TYPES}
          notes={PROJECT_TYPE_NOTES}
          value={data.projectType}
          onSelect={(projectType) => change((current) => ({ ...current, projectType }))}
          layout="grid"
          required
          error={errors.projectType}
        />

        <div className="field bf-field bf-rule" data-bf-field="">
          <label htmlFor={fieldId('goals')} className="field__label bf-label">
            {FIELD_LABELS.goals}
          </label>
          <p id={hintId} className="field__hint">
            Who it is for, what should change for them, and anything that must stay. A few sentences is plenty.
          </p>
          {errors.goals !== undefined && (
            <p id={errorId} className="field__error">
              {errors.goals}
            </p>
          )}
          <textarea
            id={fieldId('goals')}
            className="textarea bf-textarea"
            rows={6}
            value={data.goals}
            onChange={(event) => handleGoals(event.target.value)}
            aria-required="true"
            aria-invalid={errors.goals !== undefined ? true : undefined}
            aria-describedby={describedBy(hintId, countId, errors.goals !== undefined && errorId)}
          />
          <p id={countId} className="mono bf-count" data-over={goalsOver}>
            {formatCount(goalsCount)} / {formatCount(GOALS_MAX)} characters
            {goalsOver && ` · ${formatCount(goalsCount - GOALS_MAX)} over`}
          </p>
        </div>

        <div className="bf-actions">
          <button type="submit" className="btn btn--primary bf-actions__main bf-push">
            Continue
          </button>
        </div>
      </form>
    );
  }

  function renderBudgetStep() {
    return (
      <form className="bf-form" noValidate onSubmit={handleContinue}>
        <div className="bf-cluster">
          <RadioGroup
            id={fieldId('currency')}
            name={id('currency')}
            legend={FIELD_LABELS.currency}
            options={CURRENCIES}
            value={data.currency}
            onSelect={handleCurrency}
            layout="pair"
          />
          <RadioGroup
            id={fieldId('budgetRange')}
            name={id('budget-range')}
            legend={FIELD_LABELS.budgetRange}
            optional
            hint={BUDGET_HINT}
            options={budgetOptions(data.currency)}
            value={data.budgetRange}
            onSelect={(budgetRange) => {
              change((current) => ({ ...current, budgetRange }));
              setRangeCleared(null);
            }}
            onClear={() => {
              change((current) => ({ ...current, budgetRange: null }));
              setRangeCleared(null);
              announce('Budget range cleared.');
            }}
            clearLabel="budget range"
            layout="grid"
          >
            {rangeCleared !== null && (
              <p className="notice bf-cleared">
                Your {rangeCleared.from} range was cleared when you switched to {rangeCleared.to}. Choose a{' '}
                {rangeCleared.to} range, or leave it blank.
              </p>
            )}
          </RadioGroup>
        </div>

        <RadioGroup
          id={fieldId('timing')}
          name={id('timing')}
          legend={FIELD_LABELS.timing}
          optional
          hint="Roughly when you would like it ready."
          options={TIMINGS}
          value={data.timing}
          onSelect={(timing) => change((current) => ({ ...current, timing }))}
          onClear={() => {
            change((current) => ({ ...current, timing: null }));
            announce('Timing cleared.');
          }}
          clearLabel="timing"
          layout="grid"
          className="bf-rule"
        />

        <div className="bf-actions">
          <button type="button" className="btn btn--ghost" onClick={() => goTo(1)}>
            Back
          </button>
          <button type="button" className="btn btn--quiet bf-push" onClick={() => goTo(3)}>
            Skip this step
          </button>
          <button type="submit" className="btn btn--primary bf-actions__main">
            Continue
          </button>
        </div>
      </form>
    );
  }

  function renderReviewStep() {
    const groups = reviewGroups(data);
    const resetHintId = id('reset-hint');
    return (
      <>
        <form className="bf-form bf-section" noValidate onSubmit={(event) => event.preventDefault()} aria-labelledby={id('details-title')}>
          <div className="bf-section__head">
            <h3 id={id('details-title')} className="bf-section__title">
              {DETAILS_TITLE}
            </h3>
            <p className="field__hint">Written into the file you download, and nowhere else.</p>
          </div>
          <div className="bf-details">
            <TextField
              id={fieldId('name')}
              label={FIELD_LABELS.name}
              value={data.name}
              onValue={(name) => change((current) => ({ ...current, name }))}
              autoComplete="name"
              error={errors.name}
            />
            <TextField
              id={fieldId('email')}
              label={FIELD_LABELS.email}
              type="email"
              value={data.email}
              onValue={(email) => change((current) => ({ ...current, email }))}
              autoComplete="email"
              error={errors.email}
            />
            <TextField
              id={fieldId('company')}
              label={FIELD_LABELS.company}
              optional
              value={data.company}
              onValue={(company) => change((current) => ({ ...current, company }))}
              autoComplete="organization"
            />
          </div>
        </form>

        <div className="bf-section">
          <h3 className="bf-section__title">Check your answers</h3>
          <div className="bf-review">
            {groups.map((group) => (
              <div key={group.step} className="bf-review__group">
                <div className="bf-review__head">
                  <h4 className="mono bf-review__title">{group.title}</h4>
                  <button type="button" className="btn btn--quiet bf-edit" onClick={() => handleEdit(group.step)}>
                    Edit<span className="visually-hidden"> {group.title}</span>
                  </button>
                </div>
                <dl className="bf-review__list">
                  {group.items.map((item) => (
                    <div key={item.field} className="bf-review__row">
                      <dt>{item.label}</dt>
                      <dd data-empty={item.value === null}>{item.value ?? NOT_PROVIDED}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>

        <div className="bf-section bf-export panel">
          <h3 className="bf-section__title">Download your brief</h3>
          <p className="notice bf-notice">
            <InfoIcon />
            <span>{DELIVERY_NOTICE}</span>
          </p>
          <div className="bf-export__actions">
            <button type="button" className="btn btn--primary" onClick={() => handleDownload('json')}>
              <DownloadIcon />
              Download JSON
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => handleDownload('txt')}>
              <DownloadIcon />
              Download text
            </button>
          </div>
          <p className="field__hint">
            JSON suits tools and spreadsheets; text is easy to read or paste. Both are UTF-8 files created on this device.
          </p>
          <p
            className="live-region bf-export__status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-kind={exportStatus?.kind}
          >
            {exportStatus !== null && (
              <span key={exportStatus.id} className="value-pop">
                {exportStatus.text}
              </span>
            )}
          </p>
          <details
            className="bf-preview"
            onToggle={(event) => setPreviewAt(event.currentTarget.open ? localIsoTimestamp(new Date()) : null)}
          >
            <summary className="bf-preview__summary">Preview the text file</summary>
            {previewAt !== null && (
              <div className="bf-preview__body">
                <pre className="bf-preview__text">{buildBriefText(data, previewAt)}</pre>
                <button type="button" className="btn btn--ghost bf-preview__copy" onClick={() => void handleCopy()}>
                  Copy text
                </button>
              </div>
            )}
          </details>
        </div>

        <div className="bf-actions bf-actions--final">
          <button type="button" className="btn btn--ghost" onClick={() => goTo(2)}>
            Back
          </button>
          <button
            type="button"
            className="btn btn--quiet bf-push bf-reset"
            data-armed={confirmingReset}
            aria-describedby={confirmingReset ? resetHintId : undefined}
            onClick={handleStartOver}
            onKeyDown={handleStartOverKey}
          >
            {confirmingReset ? 'Confirm start over' : 'Start over'}
          </button>
          {confirmingReset && (
            <p id={resetHintId} className="bf-reset__hint">
              This clears every answer. Press again to confirm.
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <div ref={rootRef} className="bf theme-paper">
      <ol className="bf-progress" aria-label="Brief progress">
        {STEPS.map(({ step: itemStep, title }) => {
          const state = itemStep < step ? 'done' : itemStep === step ? 'current' : 'upcoming';
          return (
            <li
              key={itemStep}
              className="bf-progress__item"
              data-state={state}
              aria-current={itemStep === step ? 'step' : undefined}
            >
              <span className="mono bf-progress__index" aria-hidden="true">
                {String(itemStep).padStart(2, '0')}
              </span>
              <span className="bf-progress__title">{title}</span>
              {state === 'done' && <span className="visually-hidden"> (done)</span>}
            </li>
          );
        })}
      </ol>

      <section key={step} className="bf-step" aria-labelledby={id('step-title')}>
        <header className="bf-step__head">
          <p className="mono bf-step__count">
            Step {step} of {STEPS.length}
          </p>
          <h2 ref={headingRef} id={id('step-title')} className="bf-step__title" tabIndex={-1}>
            {meta.title}
          </h2>
          <p className="bf-step__summary">{meta.summary}</p>
        </header>
        {step === 1 && renderProjectStep()}
        {step === 2 && renderBudgetStep()}
        {step === 3 && renderReviewStep()}
      </section>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
    </div>
  );
}

/* ---------- Pieces ---------- */

interface RadioGroupProps<T extends string> {
  /** Id of the fieldset itself; also the focus target for validation. */
  id: string;
  name: string;
  legend: string;
  options: readonly Option<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  layout: 'grid' | 'pair';
  notes?: Readonly<Partial<Record<T, string>>>;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  /** When given, a "Clear" action appears while an option is selected. */
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * A native radio group in a fieldset. The fieldset takes the radiogroup role so
 * it can carry aria-invalid; its legend names it and its hint and error
 * describe it.
 */
function RadioGroup<T extends string>({
  id,
  name,
  legend,
  options,
  value,
  onSelect,
  layout,
  notes,
  hint,
  error,
  required = false,
  optional = false,
  onClear,
  clearLabel,
  className,
  children,
}: RadioGroupProps<T>) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = error !== undefined;

  function handleClear() {
    onClear?.();
    // The Clear button disappears once nothing is selected; keep focus in the group.
    fieldsetRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }

  return (
    <fieldset
      ref={fieldsetRef}
      id={id}
      className={['choices', 'bf-group', invalid && 'choices--invalid', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-describedby={describedBy(hint !== undefined && hintId, invalid && errorId)}
      aria-invalid={invalid ? true : undefined}
      aria-required={required ? true : undefined}
      data-bf-field=""
    >
      <legend id={legendId} className="bf-legend">
        {legend}
        {optional && (
          <>
            {' '}
            <span className="field__optional">(optional)</span>
          </>
        )}
      </legend>
      {hint !== undefined && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
      {children}
      <div className={`bf-options bf-options--${layout}`}>
        {options.map((option) => {
          const note = notes?.[option.value];
          return (
            <label key={option.value} className="choice bf-choice">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onSelect(option.value)}
              />
              <span className="choice__text">
                {option.label}
                {note !== undefined && <span className="choice__sub">{note}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {onClear !== undefined && value !== null && (
        <button type="button" className="btn btn--quiet bf-clear" onClick={handleClear}>
          Clear<span className="visually-hidden"> {clearLabel}</span>
        </button>
      )}
    </fieldset>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  autoComplete: string;
  type?: 'text' | 'email';
  optional?: boolean;
  error?: string;
}

function TextField({ id, label, value, onValue, autoComplete, type = 'text', optional = false, error }: TextFieldProps) {
  const errorId = `${id}-error`;
  const invalid = error !== undefined;
  const isEmail = type === 'email';
  return (
    <div className="field bf-field" data-bf-field="">
      <label htmlFor={id} className="field__label bf-label">
        {label}
        {optional && (
          <>
            {' '}
            <span className="field__optional">(optional)</span>
          </>
        )}
      </label>
      {invalid && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        autoComplete={autoComplete}
        spellCheck={isEmail ? false : undefined}
        autoCapitalize={isEmail ? 'none' : undefined}
        aria-required={optional ? undefined : true}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? errorId : undefined}
      />
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="bf-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4 14.5v2h12v-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="bf-icon bf-notice__icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v4.75M10 6.4v.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
