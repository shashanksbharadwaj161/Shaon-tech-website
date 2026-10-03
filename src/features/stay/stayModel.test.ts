import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE_TITLE,
  MAX_GUESTS,
  MAX_NIGHTS,
  PAVILIONS,
  SUGGESTION_WINDOW_DAYS,
  addDays,
  describeEmptyState,
  firstInvalidField,
  formatRange,
  isNightBlocked,
  nightsBetween,
  parseISODate,
  searchAvailability,
  stayNights,
  suggestAlternative,
  summarizeAvailability,
  toLocalISODate,
  validateSearch,
  type PavilionId,
  type SearchInput,
  type SearchResult,
} from './stayModel';

const TODAY = '2026-10-03';

const stay = (checkIn: string, nights: number, guests = 2): SearchInput => ({
  checkIn,
  checkOut: addDays(checkIn, nights),
  guests,
});

function search(input: SearchInput, today = TODAY): SearchResult {
  const outcome = searchAvailability(input, today);
  if (!outcome.ok) throw new Error(`Expected a valid search, got ${JSON.stringify(outcome.errors)}`);
  return outcome.result;
}

/** Scan forward from today for the first stay matching `predicate`. */
function findStay(nights: number, guests: number, predicate: (r: SearchResult) => boolean): SearchResult {
  for (let offset = 0; offset <= 365; offset += 1) {
    const result = search(stay(addDays(TODAY, offset), nights, guests));
    if (predicate(result)) return result;
  }
  throw new Error('No matching stay in the sample year');
}

describe('dates', () => {
  it('parses only real calendar dates', () => {
    expect(parseISODate('2026-10-03')).toBe(Date.UTC(2026, 9, 3));
    expect(parseISODate('2028-02-29')).not.toBeNull();
    expect(parseISODate('2027-02-29')).toBeNull();
    expect(parseISODate('2026-04-31')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('2026-1-5')).toBeNull();
    expect(parseISODate('0050-01-01')).toBeNull();
    expect(parseISODate('')).toBeNull();
  });

  it('adds days across month, leap-day and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('counts nights across month ends and leap days', () => {
    expect(nightsBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(nightsBetween('2027-02-28', '2027-03-01')).toBe(1);
    expect(nightsBetween('2026-10-30', '2026-11-02')).toBe(3);
    // Spans the European and North American daylight-saving changes: still whole nights.
    expect(nightsBetween('2026-03-07', '2026-04-04')).toBe(28);
    expect(nightsBetween('2026-10-15', '2026-10-12')).toBe(-3);
  });

  it('lists each night of a half-open stay, excluding the check-out date', () => {
    expect(stayNights('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(stayNights('2026-10-30', '2026-10-30')).toEqual([]);
  });

  it('reads the visitor’s calendar date from local fields', () => {
    expect(toLocalISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalISODate(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });

  it('formats ranges compactly within a month and fully across months and years', () => {
    expect(formatRange('2026-10-12', '2026-10-15')).toBe('12–15 Oct');
    expect(formatRange('2026-10-30', '2026-11-02')).toBe('30 Oct – 2 Nov');
    expect(formatRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
  });
});

describe('isNightBlocked', () => {
  const nights = Array.from({ length: 400 }, (_, i) => addDays(TODAY, i));

  it('is deterministic for the same pavilion and night', () => {
    for (const p of PAVILIONS) {
      const first = nights.map((d) => isNightBlocked(p.id, d));
      const second = nights.map((d) => isNightBlocked(p.id, d));
      expect(second).toEqual(first);
    }
  });

  it('takes roughly 30% of nights, independently per pavilion', () => {
    const patterns = PAVILIONS.map((p) => nights.map((d) => isNightBlocked(p.id, d)));
    for (const pattern of patterns) {
      const share = pattern.filter(Boolean).length / pattern.length;
      expect(share).toBeGreaterThan(0.22);
      expect(share).toBeLessThan(0.38);
    }
    expect(new Set(patterns.map((p) => p.join())).size).toBe(PAVILIONS.length);
  });
});

describe('validateSearch', () => {
  const valid = stay(addDays(TODAY, 7), 3);

  it('accepts a valid search', () => {
    expect(validateSearch(valid, TODAY)).toEqual({});
  });

  it('asks for blank dates', () => {
    expect(validateSearch({ checkIn: '', checkOut: '', guests: 2 }, TODAY)).toEqual({
      checkIn: 'Choose a check-in date',
      checkOut: 'Choose a check-out date',
    });
    expect(validateSearch({ ...valid, checkIn: '   ' }, TODAY).checkIn).toBe('Choose a check-in date');
  });

  it('rejects a check-in in the past but allows today', () => {
    expect(validateSearch(stay(addDays(TODAY, -1), 2), TODAY).checkIn).toBe('Check-in can’t be in the past');
    expect(validateSearch(stay(TODAY, 2), TODAY)).toEqual({});
  });

  it('requires check-out after check-in (reversed and same day)', () => {
    const checkIn = addDays(TODAY, 10);
    expect(validateSearch({ checkIn, checkOut: addDays(checkIn, -2), guests: 2 }, TODAY).checkOut).toBe(
      'Check-out must be after check-in',
    );
    expect(validateSearch({ checkIn, checkOut: checkIn, guests: 2 }, TODAY).checkOut).toBe(
      'Check-out must be after check-in',
    );
  });

  it(`limits stays to ${MAX_NIGHTS} nights`, () => {
    const checkIn = addDays(TODAY, 5);
    expect(validateSearch(stay(checkIn, MAX_NIGHTS), TODAY)).toEqual({});
    expect(validateSearch(stay(checkIn, MAX_NIGHTS + 1), TODAY).checkOut).toBe('Sample stays are limited to 14 nights');
  });

  it('limits check-in to 365 days ahead', () => {
    expect(validateSearch(stay(addDays(TODAY, 365), 2), TODAY)).toEqual({});
    expect(validateSearch(stay(addDays(TODAY, 366), 2), TODAY).checkIn).toBe('Choose a date within the next year');
    // Across a leap day the limit is still counted in days, not calendar years:
    // 2027-03-01 → 2028-03-01 is 366 days.
    expect(validateSearch(stay('2028-02-29', 1), '2027-03-01')).toEqual({});
    expect(validateSearch(stay('2028-03-01', 1), '2027-03-01').checkIn).toBe('Choose a date within the next year');
  });

  it(`accepts 1 to ${MAX_GUESTS} whole guests only`, () => {
    for (const guests of [1, MAX_GUESTS]) expect(validateSearch({ ...valid, guests }, TODAY)).toEqual({});
    for (const guests of [0, -1, MAX_GUESTS + 1, 2.5, Number.NaN]) {
      expect(validateSearch({ ...valid, guests }, TODAY).guests).toBe('Choose between 1 and 8 guests');
    }
  });

  it('flags malformed dates and points focus at the first invalid field in form order', () => {
    const errors = validateSearch({ checkIn: addDays(TODAY, 3), checkOut: '2026-02-30', guests: 0 }, TODAY);
    expect(errors.checkOut).toBe('Enter a real check-out date');
    expect(firstInvalidField(errors)).toBe('checkOut');
    expect(firstInvalidField({ guests: 'x', checkIn: 'y' })).toBe('checkIn');
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('searchAvailability', () => {
  it('returns the validation errors instead of results for an invalid search', () => {
    const outcome = searchAvailability({ checkIn: '', checkOut: '', guests: 2 }, TODAY);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.errors.checkIn).toBe('Choose a check-in date');
  });

  it('lists every pavilion with one strip cell per night', () => {
    const result = search(stay(addDays(TODAY, 20), 4, 2));
    expect(result.pavilions.map((p) => p.pavilion.id)).toEqual(PAVILIONS.map((p) => p.id));
    for (const p of result.pavilions) {
      expect(p.nights.map((n) => n.date)).toEqual(stayNights(result.checkIn, result.checkOut));
    }
    expect(result.nights).toBe(4);
  });

  it('excludes pavilions that sleep fewer guests than requested, with the capacity as reason', () => {
    const result = findStay(1, 3, (r) => r.pavilions.every((p) => p.takenNights === 0));
    const garden = result.pavilions.find((p) => p.pavilion.id === 'garden');
    expect(garden).toMatchObject({ available: false, fitsGuests: false, reasons: ['Sleeps up to 2 guests'] });
    for (const p of result.pavilions.filter((p) => p.pavilion.sleeps >= 3)) expect(p.available).toBe(true);
    expect(result.availableCount).toBe(3);
  });

  it('marks a stay unavailable when any single night is taken', () => {
    const id: PavilionId = 'lookout';
    // Find a night that is taken while the nights either side are free.
    let checkIn = '';
    for (let offset = 0; offset < 365 && !checkIn; offset += 1) {
      const start = addDays(TODAY, offset);
      const [a, b, c] = stayNights(start, addDays(start, 3)).map((d) => isNightBlocked(id, d));
      if (!a && b && !c) checkIn = start;
    }
    expect(checkIn).not.toBe('');

    const lookout = search(stay(checkIn, 3)).pavilions.find((p) => p.pavilion.id === id);
    expect(lookout).toMatchObject({ available: false, fitsGuests: true, takenNights: 1 });
    expect(lookout?.reasons).toEqual(['Taken on 1 of 3 sample nights']);
    expect(lookout?.nights.map((n) => n.blocked)).toEqual([false, true, false]);

    // The free first night on its own is available: the taken night is outside [checkIn, checkOut).
    const firstNightOnly = search(stay(checkIn, 1)).pavilions.find((p) => p.pavilion.id === id);
    expect(firstNightOnly?.available).toBe(true);
  });

  it('gives both reasons, capacity first, when a pavilion is too small and taken', () => {
    const result = findStay(3, 5, (r) => r.pavilions.some((p) => p.pavilion.id === 'garden' && p.takenNights > 0));
    const garden = result.pavilions.find((p) => p.pavilion.id === 'garden');
    expect(garden?.reasons[0]).toBe('Sleeps up to 2 guests');
    expect(garden?.reasons[1]).toMatch(/^Taken on [1-3] of 3 sample nights$/);
  });

  it('summarises counts with correct agreement', () => {
    expect(summarizeAvailability(2, 3, 2)).toBe('2 of 4 sample pavilions are free for 3 nights, 2 guests');
    expect(summarizeAvailability(1, 1, 1)).toBe('1 of 4 sample pavilions is free for 1 night, 1 guest');
    const result = search(stay(addDays(TODAY, 30), 2, 2));
    expect(result.summary).toBe(summarizeAvailability(result.availableCount, 2, 2));
  });
});

describe('empty state and suggestions', () => {
  it('has no empty state while at least one pavilion is free', () => {
    const result = findStay(2, 2, (r) => r.availableCount > 0);
    expect(describeEmptyState(result, TODAY)).toBeNull();
  });

  it('explains that no pavilion sleeps more than 6, without a suggestion', () => {
    const result = search(stay(addDays(TODAY, 3), 2, 7));
    expect(result.availableCount).toBe(0);
    expect(result.pavilions.every((p) => p.reasons[0] === `Sleeps up to ${p.pavilion.sleeps} guests`)).toBe(true);
    expect(describeEmptyState(result, TODAY)).toEqual({
      title: EMPTY_STATE_TITLE,
      detail: 'The largest sample pavilion sleeps 6 guests. Try fewer guests.',
      suggestion: null,
    });
    expect(suggestAlternative(result, TODAY)).toBeNull();
  });

  it('builds the empty state with a genuinely available suggestion of the same length', () => {
    const requested = findStay(5, 3, (r) => r.availableCount === 0);
    const empty = describeEmptyState(requested, TODAY);
    expect(empty?.title).toBe('No sample pavilion is free for these dates and guests');
    const suggestion = empty?.suggestion;
    if (!suggestion) throw new Error('Expected a suggestion');

    expect(suggestion.guests).toBe(3);
    expect(suggestion.nights).toBe(5);
    expect(nightsBetween(suggestion.checkIn, suggestion.checkOut)).toBe(5);

    const offset = nightsBetween(requested.checkIn, suggestion.checkIn);
    expect(offset).toBeGreaterThanOrEqual(1);
    expect(offset).toBeLessThanOrEqual(SUGGESTION_WINDOW_DAYS);

    const suggested = search(suggestion);
    expect(suggested.availableCount).toBeGreaterThan(0);
    expect(suggested.pavilions.some((p) => p.available && p.pavilion.sleeps >= 3)).toBe(true);

    // It is the earliest such start: every start in between is fully unavailable.
    for (let i = 1; i < offset; i += 1) {
      expect(search(stay(addDays(requested.checkIn, i), 5, 3)).availableCount).toBe(0);
    }
  });

  it('returns null when nothing in the 30-day window fits', () => {
    const requested = findStay(14, 6, (r) => r.availableCount === 0);
    expect(suggestAlternative(requested, TODAY)).toBeNull();
    expect(describeEmptyState(requested, TODAY)?.detail).toMatch(/next 30 days/);
  });

  it('never suggests a stay beyond the one-year horizon', () => {
    for (let offset = 340; offset <= 365; offset += 1) {
      const input = stay(addDays(TODAY, offset), 7, 4);
      const suggestion = suggestAlternative(input, TODAY);
      if (suggestion) expect(validateSearch(suggestion, TODAY)).toEqual({});
    }
    // At the very last valid check-in there is no later valid start at all.
    expect(suggestAlternative(stay(addDays(TODAY, 365), 2), TODAY)).toBeNull();
  });

  it('returns null for an invalid request', () => {
    expect(suggestAlternative({ checkIn: '', checkOut: '', guests: 2 }, TODAY)).toBeNull();
  });
});
