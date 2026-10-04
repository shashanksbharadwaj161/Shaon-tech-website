import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE_TITLE,
  MAX_DAYS_AHEAD,
  MAX_GUESTS,
  MAX_NIGHTS,
  PAVILIONS,
  SUGGESTION_WINDOW_DAYS,
  addDays,
  alignCheckOut,
  checkOutBounds,
  describeEmptyState,
  firstInvalidField,
  formatNight,
  formatRange,
  isNightBlocked,
  nightsBetween,
  parseISODate,
  searchAvailability,
  stableHash,
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

  describe('alignCheckOut', () => {
    it('leaves a check-out that still makes a valid stay', () => {
      expect(alignCheckOut('2026-10-12', '2026-10-15', '2026-10-13')).toBe('2026-10-15');
      expect(alignCheckOut('2026-10-12', '2026-10-15', '2026-10-01')).toBe('2026-10-15'); // exactly 14 nights
    });

    it('moves a check-out that is no longer after check-in, keeping the stay length', () => {
      expect(alignCheckOut('2026-10-12', '2026-10-15', '2026-10-15')).toBe('2026-10-18');
      expect(alignCheckOut('2026-10-12', '2026-10-15', '2026-10-30')).toBe('2026-11-02');
      expect(alignCheckOut('2028-02-26', '2028-02-28', '2028-02-28')).toBe('2028-03-01');
    });

    it('moves a check-out that would make the stay longer than the limit', () => {
      expect(alignCheckOut('2026-10-12', '2026-10-15', '2026-09-30')).toBe('2026-10-03');
    });

    it('falls back to one night when there was no valid previous length', () => {
      expect(alignCheckOut('', '2026-10-15', '2026-10-20')).toBe('2026-10-21');
      expect(alignCheckOut('2026-10-15', '2026-10-15', '2026-10-15')).toBe('2026-10-16');
      expect(alignCheckOut('2026-10-01', '2026-10-30', '2026-10-30')).toBe('2026-10-31');
    });

    it('never invents or changes a blank or malformed check-out, or reacts to a malformed check-in', () => {
      expect(alignCheckOut('2026-10-12', '', '2026-10-20')).toBe('');
      expect(alignCheckOut('2026-10-12', '2026-02-30', '2026-10-20')).toBe('2026-02-30');
      expect(alignCheckOut('2026-10-12', '2026-10-15', '')).toBe('2026-10-15');
    });

    it('always yields a stay that passes the date-order and length rules', () => {
      const today = '2026-10-03';
      for (let offset = 0; offset < 60; offset += 1) {
        const nextCheckIn = addDays(today, offset);
        const checkOut = alignCheckOut(addDays(today, 10), addDays(today, 13), nextCheckIn);
        expect(validateSearch({ checkIn: nextCheckIn, checkOut, guests: 2 }, today).checkOut).toBeUndefined();
      }
    });

    it('keeps the old check-out rather than emitting a malformed date past year 9999', () => {
      // A typed year can reach 9999; the date after 9999-12-31 has no YYYY-MM-DD form.
      expect(alignCheckOut('9999-12-28', '9999-12-30', '9999-12-31')).toBe('9999-12-30');
      expect(parseISODate(alignCheckOut('9999-12-20', '9999-12-22', '9999-12-29'))).not.toBeNull();
    });
  });

  describe('checkOutBounds', () => {
    it('offers exactly the check-outs that validation accepts for a chosen check-in', () => {
      const checkIn = addDays(TODAY, 20);
      const { min, max } = checkOutBounds(checkIn, TODAY);
      expect([min, max]).toEqual([addDays(checkIn, 1), addDays(checkIn, MAX_NIGHTS)]);
      const checkOutError = (checkOut: string) => validateSearch({ checkIn, checkOut, guests: 2 }, TODAY).checkOut;
      for (let d = min; d <= max; d = addDays(d, 1)) expect(checkOutError(d)).toBeUndefined();
      expect(checkOutError(addDays(min, -1))).toBe('Check-out must be after check-in');
      expect(checkOutError(addDays(max, 1))).toBe('Sample stays are limited to 14 nights');
    });

    it('allows check-in today', () => {
      expect(checkOutBounds(TODAY, TODAY)).toEqual({ min: addDays(TODAY, 1), max: addDays(TODAY, MAX_NIGHTS) });
    });

    it('never offers a past check-out, even when the typed check-in is in the past', () => {
      const wide = { min: addDays(TODAY, 1), max: addDays(TODAY, MAX_DAYS_AHEAD + MAX_NIGHTS) };
      expect(checkOutBounds(addDays(TODAY, -20), TODAY)).toEqual(wide);
      expect(checkOutBounds('', TODAY)).toEqual(wide);
      expect(checkOutBounds('2026-02-30', TODAY)).toEqual(wide);
    });
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

  it('blocks a night exactly when the unsigned hash of "id:date" mod 100 is below 30', () => {
    for (const p of PAVILIONS) {
      for (const d of nights) {
        const hash = stableHash(`${p.id}:${d}`);
        // A signed hash would give negative remainders that always count as taken.
        expect(Number.isInteger(hash) && hash >= 0 && hash <= 0xffffffff).toBe(true);
        expect(isNightBlocked(p.id, d)).toBe(hash % 100 < 30);
      }
    }
  });

  it('keeps the same sample calendar for every visitor and release (pinned fortnight)', () => {
    const fortnight = (id: PavilionId) =>
      Array.from({ length: 14 }, (_, i) => (isNightBlocked(id, addDays('2026-10-01', i)) ? 'x' : '.')).join('');
    expect(Object.fromEntries(PAVILIONS.map((p) => [p.id, fortnight(p.id)]))).toEqual({
      garden: '.xxx.x...x..x.',
      courtyard: '.x......x.....',
      lookout: '.x.xxxxxx...xx',
      long: 'x........x..xx',
    });
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
    // The limit is on check-in only: a full-length stay may end past the horizon.
    expect(validateSearch(stay(addDays(TODAY, 365), MAX_NIGHTS), TODAY)).toEqual({});
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

  it('never mutates its input and reports trimmed dates', () => {
    const checkIn = addDays(TODAY, 9);
    const input = Object.freeze({ checkIn: ` ${checkIn} `, checkOut: addDays(checkIn, 3), guests: 2 });
    const result = search(input);
    expect(result.checkIn).toBe(checkIn);
    expect(input.checkIn).toBe(` ${checkIn} `);
    expect(() => suggestAlternative(input, TODAY)).not.toThrow();
    expect(PAVILIONS.map((p) => p.sleeps)).toEqual([2, 4, 3, 6]);
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
    // The window is counted from the requested check-in, not from today.
    expect(describeEmptyState(requested, TODAY)?.detail).toBe(
      'Nothing fits in the 30 days after this check-in either. Try a shorter stay or fewer guests.',
    );
  });

  it('describes only the days it could search when the one-year limit cuts the window short', () => {
    // Near the horizon, find a request with no suggestion and check the stated window.
    let found: { result: SearchResult; window: number } | null = null;
    for (let offset = 336; offset < 365 && !found; offset += 1) {
      for (let nights = 1; nights <= MAX_NIGHTS && !found; nights += 1) {
        const result = search(stay(addDays(TODAY, offset), nights, 5));
        const empty = describeEmptyState(result, TODAY);
        if (empty && !empty.suggestion) found = { result, window: MAX_DAYS_AHEAD - offset };
      }
    }
    if (!found) throw new Error('Expected an empty state without a suggestion near the horizon');
    expect(found.window).toBeLessThan(SUGGESTION_WINDOW_DAYS);
    expect(describeEmptyState(found.result, TODAY)?.detail).toBe(
      `Nothing fits in the ${found.window} days after this check-in either. Try a shorter stay or fewer guests.`,
    );

    // At the last allowed check-in there is nothing later to search at all.
    let last: SearchResult | null = null;
    for (let nights = 1; nights <= MAX_NIGHTS && !last; nights += 1) {
      const result = search(stay(addDays(TODAY, MAX_DAYS_AHEAD), nights, 5));
      if (result.availableCount === 0) last = result;
    }
    if (!last) throw new Error('Expected a fully taken stay at the horizon');
    expect(describeEmptyState(last, TODAY)).toEqual({
      title: EMPTY_STATE_TITLE,
      detail: 'This is the last check-in the one-year sample calendar allows. Try earlier dates, a shorter stay or fewer guests.',
      suggestion: null,
    });
  });

  it('introduces a suggestion by its stay length', () => {
    const requested = findStay(5, 3, (r) => r.availableCount === 0);
    expect(describeEmptyState(requested, TODAY)?.detail).toBe('The nearest 5-night stay with a free sample pavilion:');
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

describe('time-zone independence', () => {
  // 10:30 UTC on 1 Jan 2026 is already 2 Jan at UTC+14 and still 31 Dec at UTC−11.
  const instant = new Date(Date.UTC(2026, 0, 1, 10, 30));
  const zones = [
    { zone: 'Pacific/Kiritimati', offset: -840, localDate: '2026-01-02' },
    { zone: 'Pacific/Pago_Pago', offset: 660, localDate: '2025-12-31' },
    { zone: 'Asia/Kathmandu', offset: -345, localDate: '2026-01-01' },
    { zone: 'America/St_Johns', offset: 210, localDate: '2026-01-01' },
  ];

  // Everything the demo derives from dates, including spans over daylight-saving changes.
  const fingerprint = () =>
    JSON.stringify({
      parsed: parseISODate('2026-03-29'),
      added: [addDays('2026-03-28', 1), addDays('2026-10-24', 2), addDays('2026-11-01', 1), addDays('2028-02-28', 1)],
      nights: [nightsBetween('2026-03-07', '2026-04-04'), nightsBetween('2026-10-24', '2026-11-02')],
      stay: stayNights('2026-10-24', '2026-10-27'),
      labels: [formatRange('2026-12-30', '2027-01-02'), formatNight('2026-03-29')],
      horizon: validateSearch(stay(addDays(TODAY, MAX_DAYS_AHEAD), 2), TODAY),
      summary: search(stay(addDays(TODAY, 40), 4, 3)).summary,
      suggestion: suggestAlternative(findStay(5, 3, (r) => r.availableCount === 0), TODAY),
    });

  it('gives identical dates, labels and availability in every time zone; only "today" is local', (ctx) => {
    // Node re-reads TZ when it changes. Typed locally: the app tsconfig has no Node types.
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
    const original = env.TZ;
    const baseline = fingerprint();
    try {
      for (const { zone, offset, localDate } of zones) {
        env.TZ = zone;
        ctx.skip(instant.getTimezoneOffset() !== offset, `This runtime cannot switch to ${zone}`);
        expect(toLocalISODate(instant)).toBe(localDate);
        expect(fingerprint()).toBe(baseline);
      }
    } finally {
      if (original === undefined) delete env.TZ;
      else env.TZ = original;
    }
  });
});
