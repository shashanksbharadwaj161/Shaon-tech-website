import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { PavilionDrawing } from '../../ui/ConceptDrawings';
import { MediaImage } from '../../ui/MediaImage';
import {
  DEFAULT_GUESTS,
  MAX_DAYS_AHEAD,
  MAX_GUESTS,
  MAX_NIGHTS,
  MIN_GUESTS,
  PAVILIONS,
  addDays,
  alignCheckOut,
  dayOfMonth,
  describeEmptyState,
  firstInvalidField,
  formatDay,
  formatNight,
  formatRange,
  nightsBetween,
  parseISODate,
  plural,
  searchAvailability,
  toLocalISODate,
  validateSearch,
  type NightStatus,
  type Pavilion,
  type PavilionResult,
  type SearchField,
  type SearchInput,
  type SearchResult,
  type Suggestion,
} from './stayModel';
import './stay.css';

interface FormState {
  checkIn: string;
  checkOut: string;
  /** The <select> value, converted to a number for validation. */
  guests: string;
}

interface CompletedSearch {
  result: SearchResult;
  /** Increments on every search so changed content replays its entry motion. */
  id: number;
}

type FocusTarget = SearchField | 'results';

const GUEST_OPTIONS = Array.from({ length: MAX_GUESTS - MIN_GUESTS + 1 }, (_, i) => MIN_GUESTS + i);
const SLEEPS_MIN = Math.min(...PAVILIONS.map((p) => p.sleeps));
const SLEEPS_MAX = Math.max(...PAVILIONS.map((p) => p.sleeps));

const toInput = (form: FormState): SearchInput => ({
  checkIn: form.checkIn,
  checkOut: form.checkOut,
  guests: Number(form.guests),
});

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Nights between the two form dates, when both are real and in order. */
function previewNights(form: FormState): number | null {
  if (parseISODate(form.checkIn) === null || parseISODate(form.checkOut) === null) return null;
  const nights = nightsBetween(form.checkIn, form.checkOut);
  return nights > 0 ? nights : null;
}

/** Whether the form no longer matches the search whose results are on screen. */
const formDiffers = (form: FormState, result: SearchResult) =>
  form.checkIn.trim() !== result.checkIn ||
  form.checkOut.trim() !== result.checkOut ||
  Number(form.guests) !== result.guests;

const motionAllowed = () => {
  const root = document.documentElement.dataset;
  return root.motion !== 'reduced' && root.paused !== 'true';
};

/**
 * On a single-column (phone) layout the results sit below the form, so a
 * successful check would otherwise change nothing on screen. Bring the
 * results into view, but only when the summary is not already visible.
 */
function revealIfHidden(summary: HTMLElement | null, target: HTMLElement | null) {
  if (!summary || !target) return;
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  const box = summary.getBoundingClientRect();
  if (box.top >= header && box.bottom <= window.innerHeight) return;
  target.scrollIntoView({ block: 'start', behavior: motionAllowed() ? 'smooth' : 'auto' });
}

function NightStrip({ nights, name, dim }: { nights: NightStatus[]; name: string; dim: boolean }) {
  return (
    <ol
      className="st-strip"
      data-dim={dim ? 'true' : undefined}
      aria-label={`${name}, night by night`}
      style={{ '--st-n': nights.length } as CSSProperties}
    >
      {nights.map((night, i) => (
        <li
          key={night.date}
          className="st-night"
          data-taken={night.blocked ? 'true' : 'false'}
          style={{ '--st-i': i } as CSSProperties}
        >
          <span className="st-night__bar" aria-hidden="true" />
          <span className="st-night__day" aria-hidden="true">
            {dayOfMonth(night.date)}
          </span>
          <span className="visually-hidden">
            {formatNight(night.date)}: {night.blocked ? 'taken' : 'free'}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PavilionRow({
  pavilion,
  index,
  result,
  searchId,
}: {
  pavilion: Pavilion;
  index: number;
  result: PavilionResult | undefined;
  searchId: number;
}) {
  const state = result ? (result.available ? 'available' : 'unavailable') : 'idle';
  return (
    <li className="st-row" data-state={state}>
      <span className="st-row__index mono" aria-hidden="true">
        {pad2(index + 1)}
      </span>

      <div className="st-row__info">
        <h5 className="st-row__name">{pavilion.name}</h5>
        <p className="st-row__feature">{pavilion.feature}</p>
        <p className="st-row__sleeps mono">Sleeps {pavilion.sleeps}</p>
      </div>

      <div className="st-row__status">
        <p key={`badge-${searchId}`} className="st-badge value-pop" data-state={state}>
          <span className="st-badge__dot" aria-hidden="true" />
          {state === 'available' ? 'Available' : state === 'unavailable' ? 'Unavailable' : 'Not checked yet'}
        </p>
        {result &&
          (result.available ? (
            <p key={`note-${searchId}`} className="st-row__note">
              Sample availability only — no booking
            </p>
          ) : (
            <ul key={`reasons-${searchId}`} className="st-row__reasons">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ))}
      </div>

      {result && (
        <div className="st-row__strip">
          <NightStrip key={searchId} nights={result.nights} name={pavilion.name} dim={!result.fitsGuests} />
        </div>
      )}
    </li>
  );
}

export function StayDemo({ today }: { today?: string }) {
  const todayISO = useMemo(
    () => (today !== undefined && parseISODate(today) !== null ? today : toLocalISODate(new Date())),
    [today],
  );

  const uid = useId();
  const headingId = `${uid}-heading`;
  const formHeadingId = `${uid}-form-heading`;
  const resultsHeadingId = `${uid}-results-heading`;
  const emptyDetailId = `${uid}-empty-detail`;
  const fieldIds: Record<SearchField, string> = {
    checkIn: `${uid}-check-in`,
    checkOut: `${uid}-check-out`,
    guests: `${uid}-guests`,
  };

  const [form, setForm] = useState<FormState>(() => ({
    checkIn: addDays(todayISO, 7),
    checkOut: addDays(todayISO, 10),
    guests: String(DEFAULT_GUESTS),
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [search, setSearch] = useState<CompletedSearch | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget; tick: number } | null>(null);

  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLSelectElement>(null);
  const resultsHeadRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const focusTick = useRef(0);
  /** Set by a submitted search; consumed once the new results have rendered. */
  const revealPending = useRef(false);

  useEffect(() => {
    if (!search || !revealPending.current) return;
    revealPending.current = false;
    revealIfHidden(summaryRef.current, resultsHeadRef.current);
  }, [search]);

  // Focus after React has rendered the error text, so the description is read with the field.
  useEffect(() => {
    if (!focusRequest) return;
    const targets = {
      checkIn: checkInRef,
      checkOut: checkOutRef,
      guests: guestsRef,
      results: resultsHeadingRef,
    } as const;
    targets[focusRequest.target].current?.focus();
  }, [focusRequest]);

  const requestFocus = (target: FocusTarget) => {
    focusTick.current += 1;
    setFocusRequest({ target, tick: focusTick.current });
  };

  // After a failed attempt, errors follow the form live so they clear as fields are fixed.
  const errors = useMemo(() => (showErrors ? validateSearch(toInput(form), todayISO) : {}), [showErrors, form, todayISO]);
  const empty = useMemo(() => (search ? describeEmptyState(search.result, todayISO) : null), [search, todayISO]);
  const lengthNights = previewNights(form);

  const runSearch = (input: SearchInput, reveal: boolean): boolean => {
    const outcome = searchAvailability(input, todayISO);
    if (!outcome.ok) {
      setShowErrors(true);
      const first = firstInvalidField(outcome.errors);
      if (first) requestFocus(first);
      return false;
    }
    setShowErrors(false);
    revealPending.current = reveal;
    setSearch((previous) => ({ result: outcome.result, id: (previous?.id ?? 0) + 1 }));
    return true;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Focus stays on the button (so it can be pressed again); the summary is announced politely.
    runSearch(toInput(form), true);
  };

  const trySuggestion = (suggestion: Suggestion) => {
    setForm({ checkIn: suggestion.checkIn, checkOut: suggestion.checkOut, guests: String(suggestion.guests) });
    // The suggest button disappears with the empty state; keep focus on the new results.
    if (runSearch(suggestion, false)) requestFocus('results');
  };

  const update = (field: 'checkOut' | 'guests') => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Moving check-in past check-out (or more than the limit before it) carries check-out along.
  const updateCheckIn = (value: string) =>
    setForm((f) => ({ ...f, checkIn: value, checkOut: alignCheckOut(f.checkIn, f.checkOut, value) }));

  const describedBy = (field: SearchField, hint: boolean) =>
    [hint ? `${fieldIds[field]}-hint` : '', errors[field] ? `${fieldIds[field]}-error` : ''].filter(Boolean).join(' ') ||
    undefined;

  const checkInValid = parseISODate(form.checkIn) !== null;
  const checkOutMin = checkInValid ? addDays(form.checkIn, 1) : addDays(todayISO, 1);
  const checkOutMax = checkInValid ? addDays(form.checkIn, MAX_NIGHTS) : addDays(todayISO, MAX_DAYS_AHEAD + MAX_NIGHTS);

  const resultsById = new Map(search?.result.pavilions.map((p) => [p.pavilion.id, p] as const));
  const suggestion = empty?.suggestion ?? null;
  const stale = search !== null && formDiffers(form, search.result);

  return (
    <section className="st theme-ink" aria-labelledby={headingId}>
      <header className="st-head">
        <div className="st-head__bar">
          <p className="mono st-head__kicker">Hospitality / Pavilion explorer</p>
          <span className="sample-label">Sample inventory</span>
        </div>
        <div className="st-head__grid">
          <div className="st-head__text">
            <h3 id={headingId} className="st-head__title">
              Sample pavilion availability
            </h3>
            <p className="st-head__lede">
              Four fictional pavilions with a generated sample calendar. Choose dates and guests to see which are free,
              night by night. There are no prices and nothing can be booked.
            </p>
            <dl className="st-facts">
              <div>
                <dt className="mono">Pavilions</dt>
                <dd>{PAVILIONS.length} samples</dd>
              </div>
              <div>
                <dt className="mono">Sleeps</dt>
                <dd>
                  {SLEEPS_MIN}–{SLEEPS_MAX} guests
                </dd>
              </div>
              <div>
                <dt className="mono">Stays</dt>
                <dd>Up to {MAX_NIGHTS} nights</dd>
              </div>
            </dl>
          </div>
          <MediaImage
            media="pavilion"
            className="st-media"
            sizes="(min-width: 1180px) 1100px, 100vw"
            fallback={<PavilionDrawing />}
            caption="Concept render — fictional pavilion"
          />
        </div>
      </header>

      <div className="st-body">
        <form className="st-form" noValidate onSubmit={onSubmit} aria-labelledby={formHeadingId}>
          <div className="st-form__head">
            <h4 id={formHeadingId} className="st-form__title">
              Dates and guests
            </h4>
            <p className="mono st-form__today">Sample calendar · today {formatNight(todayISO)}</p>
          </div>

          <div className="st-fields">
            <div className="field">
              <label className="field__label" htmlFor={fieldIds.checkIn}>
                Check-in
              </label>
              <input
                ref={checkInRef}
                id={fieldIds.checkIn}
                className="input st-date"
                type="date"
                value={form.checkIn}
                min={todayISO}
                max={addDays(todayISO, MAX_DAYS_AHEAD)}
                onChange={(e) => updateCheckIn(e.target.value)}
                aria-invalid={errors.checkIn ? true : undefined}
                aria-describedby={describedBy('checkIn', true)}
              />
              <p className="field__hint" id={`${fieldIds.checkIn}-hint`}>
                From {formatDay(todayISO)}, up to a year ahead
              </p>
              {errors.checkIn && (
                <p className="field__error" id={`${fieldIds.checkIn}-error`}>
                  {errors.checkIn}
                </p>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor={fieldIds.checkOut}>
                Check-out
              </label>
              <input
                ref={checkOutRef}
                id={fieldIds.checkOut}
                className="input st-date"
                type="date"
                value={form.checkOut}
                min={checkOutMin}
                max={checkOutMax}
                onChange={(e) => update('checkOut')(e.target.value)}
                aria-invalid={errors.checkOut ? true : undefined}
                aria-describedby={describedBy('checkOut', true)}
              />
              <p className="field__hint" id={`${fieldIds.checkOut}-hint`}>
                Up to {MAX_NIGHTS} nights
              </p>
              {errors.checkOut && (
                <p className="field__error" id={`${fieldIds.checkOut}-error`}>
                  {errors.checkOut}
                </p>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor={fieldIds.guests}>
                Guests
              </label>
              <select
                ref={guestsRef}
                id={fieldIds.guests}
                className="select"
                value={form.guests}
                onChange={(e) => update('guests')(e.target.value)}
                aria-invalid={errors.guests ? true : undefined}
                aria-describedby={describedBy('guests', true)}
              >
                {GUEST_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {plural(n, 'guest')}
                  </option>
                ))}
              </select>
              <p className="field__hint" id={`${fieldIds.guests}-hint`}>
                Sample pavilions sleep {SLEEPS_MIN} to {SLEEPS_MAX}
              </p>
              {errors.guests && (
                <p className="field__error" id={`${fieldIds.guests}-error`}>
                  {errors.guests}
                </p>
              )}
            </div>
          </div>

          <div className="st-length" data-over={lengthNights !== null && lengthNights > MAX_NIGHTS ? 'true' : undefined}>
            <p className="st-length__text">
              <span className="mono st-length__label">Stay length</span>
              <span key={lengthNights ?? 'none'} className="st-length__value value-pop">
                {lengthNights === null ? '—' : plural(lengthNights, 'night')}
              </span>
            </p>
            <span className="st-length__ticks" aria-hidden="true">
              {Array.from({ length: MAX_NIGHTS }, (_, i) => (
                <span key={i} data-on={lengthNights !== null && i < lengthNights ? 'true' : undefined} />
              ))}
            </span>
          </div>

          <button type="submit" className="btn btn--primary st-submit">
            Check sample availability
          </button>
          <p className="st-form__note">Checks a fixed sample pattern in this page. Nothing is reserved, held or sent.</p>
        </form>

        <div className="st-results">
          <div className="st-results__head" ref={resultsHeadRef}>
            <h4 id={resultsHeadingId} ref={resultsHeadingRef} tabIndex={-1} className="st-results__title">
              Sample pavilions
            </h4>
            {search && (
              <p className="mono st-results__query">
                <span className="visually-hidden">Showing </span>
                {formatRange(search.result.checkIn, search.result.checkOut)} · {plural(search.result.nights, 'night')} ·{' '}
                {plural(search.result.guests, 'guest')}
              </p>
            )}
            {stale && (
              <p className="st-stale">
                <span className="st-stale__dot" aria-hidden="true" />
                Dates or guests changed — check again to update
              </p>
            )}
          </div>

          <p ref={summaryRef} className="st-summary" role="status" aria-live="polite" aria-atomic="true">
            {search ? (
              <span key={search.id} className="value-pop">
                {search.result.summary}.
                {suggestion && (
                  <span className="visually-hidden">
                    {' '}
                    Nearest free dates: {formatRange(suggestion.checkIn, suggestion.checkOut)}.
                  </span>
                )}
              </span>
            ) : (
              <span className="st-summary__idle">Choose dates and guests, then check sample availability.</span>
            )}
          </p>

          {search && (
            <p className="st-legend mono" aria-hidden="true">
              <span className="st-legend__item" data-kind="free">
                Free
              </span>
              <span className="st-legend__item" data-kind="taken">
                Taken
              </span>
            </p>
          )}

          {search && empty && (
            <div key={search.id} className="empty-state st-empty">
              <p className="mono st-empty__kicker">0 of {PAVILIONS.length} free</p>
              <strong>{empty.title}</strong>
              <p id={emptyDetailId}>{empty.detail}</p>
              {suggestion && (
                <button
                  type="button"
                  className="btn btn--primary st-empty__try"
                  aria-describedby={emptyDetailId}
                  onClick={() => trySuggestion(suggestion)}
                >
                  Try {formatRange(suggestion.checkIn, suggestion.checkOut)}
                </button>
              )}
            </div>
          )}

          <ol className="st-list" aria-labelledby={resultsHeadingId}>
            {PAVILIONS.map((pavilion, index) => (
              <PavilionRow
                key={pavilion.id}
                pavilion={pavilion}
                index={index}
                result={resultsById.get(pavilion.id)}
                searchId={search?.id ?? 0}
              />
            ))}
          </ol>
        </div>
      </div>

      <p className="mono st-foot">Sample inventory · Generated pattern, not a live calendar · No prices, booking or messages</p>
    </section>
  );
}
