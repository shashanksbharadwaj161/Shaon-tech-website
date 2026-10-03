/**
 * Hospitality stay — pure model for the sample pavilion availability explorer.
 *
 * Everything here is a fictional studio concept: the pavilions, their sizes
 * and the "availability" are sample data generated from a fixed pattern.
 *
 * Dates are 'YYYY-MM-DD' strings. All arithmetic happens on UTC midnights
 * (Date.UTC), never on local-time Date parsing, so every result is the same
 * in every time zone and across daylight-saving changes.
 */

export type PavilionId = 'garden' | 'courtyard' | 'lookout' | 'long';

export interface Pavilion {
  readonly id: PavilionId;
  readonly name: string;
  /** Maximum number of guests. */
  readonly sleeps: number;
  /** One short, neutral description line. */
  readonly feature: string;
}

export const PAVILIONS: readonly Pavilion[] = [
  { id: 'garden', name: 'Garden pavilion', sleeps: 2, feature: 'Single room opening onto a planted court' },
  { id: 'courtyard', name: 'Courtyard pavilion', sleeps: 4, feature: 'Two rooms either side of a shaded courtyard' },
  { id: 'lookout', name: 'Lookout pavilion', sleeps: 3, feature: 'Raised room with one long window to the trees' },
  { id: 'long', name: 'Long pavilion', sleeps: 6, feature: 'Three rooms in a row beneath one folded roof' },
];

/** Longest sample stay, in nights. */
export const MAX_NIGHTS = 14;
export const MIN_GUESTS = 1;
export const MAX_GUESTS = 8;
export const DEFAULT_GUESTS = 2;
/** Check-in may be at most this many days after today. */
export const MAX_DAYS_AHEAD = 365;
/** How many days after the requested check-in suggestAlternative looks. */
export const SUGGESTION_WINDOW_DAYS = 30;
/** Share of sample nights (in percent) that the generator marks as taken. */
export const BLOCKED_PERCENT = 30;

export const MESSAGES = {
  checkInBlank: 'Choose a check-in date',
  checkInInvalid: 'Enter a real check-in date',
  checkInPast: 'Check-in can’t be in the past',
  checkInTooFar: 'Choose a date within the next year',
  checkOutBlank: 'Choose a check-out date',
  checkOutInvalid: 'Enter a real check-out date',
  checkOutOrder: 'Check-out must be after check-in',
  tooManyNights: `Sample stays are limited to ${MAX_NIGHTS} nights`,
  guestsRange: `Choose between ${MIN_GUESTS} and ${MAX_GUESTS} guests`,
} as const;

export const EMPTY_STATE_TITLE = 'No sample pavilion is free for these dates and guests';

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/* ---------------------------------------------------------------------------
   Dates
   ------------------------------------------------------------------------- */

/**
 * Parse a strict 'YYYY-MM-DD' calendar date to its UTC-midnight timestamp.
 * Returns null for anything that is not a real calendar date (e.g. 2027-02-29).
 */
export function parseISODate(iso: string): number | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  // Date.UTC rolls invalid days over (Feb 30 → Mar 2) and maps years 0–99 to
  // 1900–1999; a round trip catches both.
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return ms;
}

/** Format a UTC-midnight timestamp as 'YYYY-MM-DD'. */
export function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The visitor's own calendar date as 'YYYY-MM-DD'. This is the one place that
 * deliberately reads local time: "today" is whatever day it is for the visitor.
 */
export function toLocalISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function requireDate(iso: string): number {
  const ms = parseISODate(iso);
  if (ms === null) throw new RangeError(`Expected a YYYY-MM-DD date, got "${iso}"`);
  return ms;
}

/** The date `n` days after (or before, for negative n) `iso`. */
export function addDays(iso: string, n: number): string {
  if (!Number.isInteger(n)) throw new RangeError(`Expected a whole number of days, got ${n}`);
  return toISODate(requireDate(iso) + n * DAY_MS);
}

/** Number of nights from check-in `a` to check-out `b` (negative when b is before a). */
export function nightsBetween(a: string, b: string): number {
  return Math.round((requireDate(b) - requireDate(a)) / DAY_MS);
}

/** Each night of the stay [checkIn, checkOut), named by the date it starts. */
export function stayNights(checkIn: string, checkOut: string): string[] {
  const count = nightsBetween(checkIn, checkOut);
  return Array.from({ length: Math.max(0, count) }, (_, i) => addDays(checkIn, i));
}

/* ---------------------------------------------------------------------------
   Deterministic sample availability
   ------------------------------------------------------------------------- */

/**
 * A stable 32-bit string hash: FNV-1a over UTF-16 code units, finished with
 * the MurmurHash3 avalanche so neighbouring dates land far apart.
 */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Whether the sample night starting on `date` is taken for pavilion `id`. */
export function isNightBlocked(id: PavilionId, date: string): boolean {
  return stableHash(`${id}:${date}`) % 100 < BLOCKED_PERCENT;
}

/* ---------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */

export interface SearchInput {
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface SearchErrors {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
}

export type SearchField = keyof SearchErrors;

/** Visual (and focus) order of the form fields. */
export const FIELD_ORDER: readonly SearchField[] = ['checkIn', 'checkOut', 'guests'];

export function hasErrors(errors: SearchErrors): boolean {
  return FIELD_ORDER.some((field) => errors[field] !== undefined);
}

/** The first field, in form order, that has an error. */
export function firstInvalidField(errors: SearchErrors): SearchField | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

/** Validate a search against `today` ('YYYY-MM-DD'). Returns one message per invalid field. */
export function validateSearch(input: SearchInput, today: string): SearchErrors {
  const todayMs = requireDate(today);
  const errors: SearchErrors = {};

  const checkInText = input.checkIn.trim();
  const checkOutText = input.checkOut.trim();
  const checkIn = checkInText === '' ? null : parseISODate(checkInText);
  const checkOut = checkOutText === '' ? null : parseISODate(checkOutText);

  if (checkInText === '') errors.checkIn = MESSAGES.checkInBlank;
  else if (checkIn === null) errors.checkIn = MESSAGES.checkInInvalid;
  else if (checkIn < todayMs) errors.checkIn = MESSAGES.checkInPast;
  else if ((checkIn - todayMs) / DAY_MS > MAX_DAYS_AHEAD) errors.checkIn = MESSAGES.checkInTooFar;

  if (checkOutText === '') errors.checkOut = MESSAGES.checkOutBlank;
  else if (checkOut === null) errors.checkOut = MESSAGES.checkOutInvalid;
  else if (checkIn !== null) {
    const nights = Math.round((checkOut - checkIn) / DAY_MS);
    if (nights <= 0) errors.checkOut = MESSAGES.checkOutOrder;
    else if (nights > MAX_NIGHTS) errors.checkOut = MESSAGES.tooManyNights;
  }

  if (!Number.isInteger(input.guests) || input.guests < MIN_GUESTS || input.guests > MAX_GUESTS) {
    errors.guests = MESSAGES.guestsRange;
  }

  return errors;
}

/* ---------------------------------------------------------------------------
   Search
   ------------------------------------------------------------------------- */

export interface NightStatus {
  /** The date the night starts. */
  date: string;
  blocked: boolean;
}

export interface PavilionResult {
  pavilion: Pavilion;
  available: boolean;
  fitsGuests: boolean;
  nights: NightStatus[];
  takenNights: number;
  /** Why the pavilion is unavailable (capacity first); empty when available. */
  reasons: string[];
}

export interface SearchResult {
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pavilions: PavilionResult[];
  availableCount: number;
  /** Polite one-line summary, e.g. "2 of 4 sample pavilions are free for 3 nights, 2 guests". */
  summary: string;
}

export type SearchOutcome = { ok: true; result: SearchResult } | { ok: false; errors: SearchErrors };

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function summarizeAvailability(availableCount: number, nights: number, guests: number): string {
  const verb = availableCount === 1 ? 'is' : 'are';
  return `${availableCount} of ${PAVILIONS.length} sample pavilions ${verb} free for ${plural(nights, 'night')}, ${plural(guests, 'guest')}`;
}

function checkPavilion(pavilion: Pavilion, dates: readonly string[], guests: number): PavilionResult {
  const nights = dates.map((date) => ({ date, blocked: isNightBlocked(pavilion.id, date) }));
  const takenNights = nights.filter((night) => night.blocked).length;
  const fitsGuests = guests <= pavilion.sleeps;
  const reasons: string[] = [];
  if (!fitsGuests) reasons.push(`Sleeps up to ${plural(pavilion.sleeps, 'guest')}`);
  if (takenNights > 0) reasons.push(`Taken on ${takenNights} of ${plural(nights.length, 'sample night')}`);
  return { pavilion, available: fitsGuests && takenNights === 0, fitsGuests, nights, takenNights, reasons };
}

/**
 * Check every sample pavilion for the stay [checkIn, checkOut). A pavilion is
 * available only when it sleeps enough guests and no night is taken.
 */
export function searchAvailability(input: SearchInput, today: string): SearchOutcome {
  const errors = validateSearch(input, today);
  if (hasErrors(errors)) return { ok: false, errors };

  const checkIn = input.checkIn.trim();
  const checkOut = input.checkOut.trim();
  const dates = stayNights(checkIn, checkOut);
  const pavilions = PAVILIONS.map((pavilion) => checkPavilion(pavilion, dates, input.guests));
  const availableCount = pavilions.filter((p) => p.available).length;
  return {
    ok: true,
    result: {
      checkIn,
      checkOut,
      guests: input.guests,
      nights: dates.length,
      pavilions,
      availableCount,
      summary: summarizeAvailability(availableCount, dates.length, input.guests),
    },
  };
}

/** Whether at least one pavilion fits the stay. Assumes an already-valid input. */
function anyPavilionFits(checkIn: string, checkOut: string, guests: number): boolean {
  const dates = stayNights(checkIn, checkOut);
  return PAVILIONS.some((p) => guests <= p.sleeps && dates.every((date) => !isNightBlocked(p.id, date)));
}

export interface Suggestion extends SearchInput {
  nights: number;
}

/**
 * The earliest stay of the same length and guest count, starting 1 to
 * SUGGESTION_WINDOW_DAYS days after the requested check-in, where at least one
 * pavilion is free. Stays that would fail validation (beyond the one-year
 * horizon) are never suggested. Null when the input is invalid or nothing fits.
 */
export function suggestAlternative(input: SearchInput, today: string): Suggestion | null {
  if (hasErrors(validateSearch(input, today))) return null;
  const checkIn = input.checkIn.trim();
  const nights = nightsBetween(checkIn, input.checkOut.trim());
  if (!PAVILIONS.some((p) => input.guests <= p.sleeps)) return null;

  for (let offset = 1; offset <= SUGGESTION_WINDOW_DAYS; offset += 1) {
    const start = addDays(checkIn, offset);
    const end = addDays(start, nights);
    // Later starts only move further out, so the first invalid one ends the search.
    if (hasErrors(validateSearch({ checkIn: start, checkOut: end, guests: input.guests }, today))) break;
    if (anyPavilionFits(start, end, input.guests)) {
      return { checkIn: start, checkOut: end, guests: input.guests, nights };
    }
  }
  return null;
}

export interface EmptyState {
  title: string;
  detail: string;
  suggestion: Suggestion | null;
}

/** What to show when no pavilion fits; null when at least one does. */
export function describeEmptyState(result: SearchResult, today: string): EmptyState | null {
  if (result.availableCount > 0) return null;
  const largest = Math.max(...PAVILIONS.map((p) => p.sleeps));
  if (result.guests > largest) {
    return {
      title: EMPTY_STATE_TITLE,
      detail: `The largest sample pavilion sleeps ${plural(largest, 'guest')}. Try fewer guests.`,
      suggestion: null,
    };
  }
  const suggestion = suggestAlternative(result, today);
  return {
    title: EMPTY_STATE_TITLE,
    detail: suggestion
      ? `The nearest ${plural(result.nights, 'night')} with a free sample pavilion:`
      : `Nothing fits in the next ${SUGGESTION_WINDOW_DAYS} days either. Try a shorter stay or fewer guests.`,
    suggestion,
  };
}

/* ---------------------------------------------------------------------------
   Display formatting (en-GB, UTC — never the visitor's time zone)
   ------------------------------------------------------------------------- */

const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const NIGHT_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "12 Oct" */
export function formatDay(iso: string): string {
  return DAY_MONTH.format(requireDate(iso));
}

/** "Mon 12 Oct" */
export function formatNight(iso: string): string {
  return NIGHT_LABEL.format(requireDate(iso));
}

/** Day of the month, 1–31. */
export function dayOfMonth(iso: string): number {
  return new Date(requireDate(iso)).getUTCDate();
}

/** "12–15 Oct", "30 Oct – 2 Nov", or "30 Dec 2026 – 2 Jan 2027" across a year end. */
export function formatRange(checkIn: string, checkOut: string): string {
  const a = new Date(requireDate(checkIn));
  const b = new Date(requireDate(checkOut));
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${DAY_MONTH_YEAR.format(a)} – ${DAY_MONTH_YEAR.format(b)}`;
  }
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${DAY_MONTH.format(b)}`;
  }
  return `${DAY_MONTH.format(a)} – ${DAY_MONTH.format(b)}`;
}
