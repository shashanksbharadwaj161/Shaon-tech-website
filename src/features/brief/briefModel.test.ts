import { describe, expect, it } from 'vitest';
import {
  EMPTY_BRIEF,
  GOALS_MAX,
  JPY_RANGES,
  USD_RANGES,
  budgetCurrency,
  budgetOptions,
  characterCount,
  firstInvalidField,
  hasErrors,
  isValidEmail,
  revalidateErrors,
  reviewGroups,
  setCurrency,
  validateStep,
  type BriefData,
  type FieldErrors,
} from './briefModel';

const brief = (overrides: Partial<BriefData> = {}): BriefData => ({ ...EMPTY_BRIEF, ...overrides });

const VALID_STEP_1 = { projectType: 'website', goals: 'A calmer booking flow for returning guests.' } as const;

describe('step 1 — project & goals (required)', () => {
  it('requires both a project type and goals, in on-screen order', () => {
    const errors = validateStep(1, EMPTY_BRIEF);
    expect(Object.keys(errors)).toEqual(['projectType', 'goals']);
    expect(firstInvalidField(1, errors)).toBe('projectType');
  });

  it('passes with a type and non-blank goals', () => {
    expect(validateStep(1, brief(VALID_STEP_1))).toEqual({});
  });

  it('treats whitespace-only goals as missing', () => {
    const errors = validateStep(1, brief({ projectType: 'app', goals: '  \n\t  \n' }));
    expect(Object.keys(errors)).toEqual(['goals']);
    expect(firstInvalidField(1, errors)).toBe('goals');
  });

  it('allows exactly the maximum and rejects one character more', () => {
    expect(validateStep(1, brief({ projectType: 'both', goals: 'a'.repeat(GOALS_MAX) }))).toEqual({});
    const over = validateStep(1, brief({ projectType: 'both', goals: 'a'.repeat(GOALS_MAX + 1) }));
    expect(over.goals).toMatch(/2,000 characters or fewer — 1 character too many/);
  });

  it('measures the limit after trimming, so surrounding spaces never push it over', () => {
    expect(validateStep(1, brief({ projectType: 'app', goals: `   ${'b'.repeat(GOALS_MAX)}\n\n` }))).toEqual({});
  });

  it('counts characters as people do: an emoji or a kanji counts once', () => {
    expect(characterCount('山田 花子')).toBe(5);
    expect(characterCount('👋🏽')).toBe(2); // base + skin-tone modifier are two code points
    const emoji = '😀'.repeat(GOALS_MAX); // 4,000 UTF-16 code units, 2,000 characters
    expect(emoji.length).toBe(GOALS_MAX * 2);
    expect(validateStep(1, brief({ projectType: 'unsure', goals: emoji }))).toEqual({});
  });
});

describe('step 2 — budget & timing (optional)', () => {
  it('never blocks, whatever is or is not chosen', () => {
    expect(validateStep(2, EMPTY_BRIEF)).toEqual({});
    expect(validateStep(2, brief({ currency: 'JPY', budgetRange: 'jpy-3000000-plus', timing: '6-plus-months' }))).toEqual({});
    expect(firstInvalidField(2, validateStep(2, EMPTY_BRIEF))).toBeNull();
  });

  it('offers the agreed USD and JPY ranges, each ending with "Not sure"', () => {
    expect(budgetOptions('USD')).toBe(USD_RANGES);
    expect(budgetOptions('USD').map((o) => o.label)).toEqual([
      'Under $5,000',
      '$5,000–$15,000',
      '$15,000–$30,000',
      '$30,000+',
      'Not sure',
    ]);
    expect(budgetOptions('JPY')).toBe(JPY_RANGES);
    expect(budgetOptions('JPY').map((o) => o.value)).toEqual([
      'jpy-under-500000',
      'jpy-500000-1500000',
      'jpy-1500000-3000000',
      'jpy-3000000-plus',
      'not-sure',
    ]);
    expect(budgetOptions('JPY').map((o) => o.label)).toContain('¥500,000–¥1,500,000');
  });

  it('never mixes currencies within one list', () => {
    for (const option of budgetOptions('USD')) expect(option.value).not.toMatch(/^jpy-/);
    for (const option of budgetOptions('JPY')) expect(option.value).not.toMatch(/^usd-/);
  });
});

describe('setCurrency', () => {
  it('clears a USD range when switching to JPY', () => {
    const next = setCurrency(brief({ budgetRange: 'usd-5000-15000' }), 'JPY');
    expect(next.currency).toBe('JPY');
    expect(next.budgetRange).toBeNull();
  });

  it('clears a JPY range when switching back to USD', () => {
    const next = setCurrency(brief({ currency: 'JPY', budgetRange: 'jpy-under-500000' }), 'USD');
    expect(next).toMatchObject({ currency: 'USD', budgetRange: null });
  });

  it('keeps "not-sure", which fits either currency', () => {
    const next = setCurrency(brief({ budgetRange: 'not-sure' }), 'JPY');
    expect(next).toMatchObject({ currency: 'JPY', budgetRange: 'not-sure' });
  });

  it('leaves every other answer untouched', () => {
    const before = brief({ ...VALID_STEP_1, budgetRange: 'usd-30000-plus', timing: '1-3-months', name: '山田 花子' });
    const after = setCurrency(before, 'JPY');
    expect({ ...after, currency: before.currency, budgetRange: before.budgetRange }).toEqual(before);
  });

  it('returns the same object when the currency does not change', () => {
    const data = brief({ budgetRange: 'usd-under-5000' });
    expect(setCurrency(data, 'USD')).toBe(data);
  });
});

describe('step 3 — your details', () => {
  const details = { name: 'Aiko Example', email: 'aiko@example.com' };

  it('requires a name and an email; company is optional', () => {
    const errors = validateStep(3, EMPTY_BRIEF);
    expect(Object.keys(errors)).toEqual(['name', 'email']);
    expect(validateStep(3, brief(details))).toEqual({});
    expect(validateStep(3, brief({ ...details, company: '' })).company).toBeUndefined();
  });

  it('rejects a whitespace-only name', () => {
    expect(validateStep(3, brief({ ...details, name: '   ' })).name).toBe('Enter your name.');
  });

  it('checks the email format after trimming', () => {
    expect(isValidEmail('  aiko@example.com \n')).toBe(true);
    for (const bad of ['aiko', 'aiko@example', 'aiko@@example.com', 'ai ko@example.com', '@example.com', 'aiko@.']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
    expect(validateStep(3, brief({ ...details, email: 'aiko@example' })).email).toMatch(/format/);
    expect(validateStep(3, brief({ ...details, email: '   ' })).email).toBe('Enter your email address.');
  });

  it('focuses the first invalid field in on-screen order, regardless of how errors were collected', () => {
    const outOfOrder: FieldErrors = { email: 'x', name: 'y' };
    expect(firstInvalidField(3, outOfOrder)).toBe('name');
    expect(firstInvalidField(3, { email: 'x' })).toBe('email');
    expect(firstInvalidField(3, {})).toBeNull();
    // Errors belonging to another step are ignored.
    expect(firstInvalidField(3, { goals: 'x' })).toBeNull();
  });
});

describe('revalidateErrors', () => {
  it('clears an error as soon as the field is fixed', () => {
    const shown = validateStep(3, EMPTY_BRIEF);
    const next = revalidateErrors(shown, 3, brief({ name: 'Aiko' }));
    expect(next).toEqual({ email: 'Enter your email address.' });
  });

  it('updates the message while the field is still wrong', () => {
    const next = revalidateErrors({ email: 'Enter your email address.' }, 3, brief({ email: 'aiko@' }));
    expect(next.email).toMatch(/format/);
  });

  it('never adds errors to fields the visitor has not been told about yet', () => {
    const next = revalidateErrors({ name: 'Enter your name.' }, 3, brief({ name: 'Aiko', email: '' }));
    expect(hasErrors(next)).toBe(false);
  });
});

describe('reviewGroups', () => {
  it('lists every answer by step, with skipped optional answers as null ("Not provided")', () => {
    const groups = reviewGroups(brief({ ...VALID_STEP_1, name: '  Aiko  ', email: 'aiko@example.com', company: '   ' }));
    expect(groups.map((g) => [g.step, g.title])).toEqual([
      [1, 'Project & goals'],
      [2, 'Budget & timing'],
      [3, 'Your details'],
    ]);
    const values = Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.field, i.value])));
    expect(values).toEqual({
      projectType: 'A website',
      goals: VALID_STEP_1.goals,
      currency: null,
      budgetRange: null,
      timing: null,
      name: 'Aiko',
      email: 'aiko@example.com',
      company: null,
    });
  });

  it('only reports a currency once a range is chosen, using the range’s own currency', () => {
    expect(budgetCurrency(brief({ currency: 'JPY' }))).toBeNull();
    expect(budgetCurrency(brief({ currency: 'JPY', budgetRange: 'not-sure' }))).toBe('JPY');
    const budget = reviewGroups(brief({ currency: 'JPY', budgetRange: 'jpy-1500000-3000000', timing: '3-6-months' }))[1];
    expect(budget.items.map((i) => [i.label, i.value])).toEqual([
      ['Budget currency', 'JPY'],
      ['Budget range', '¥1,500,000–¥3,000,000'],
      ['Timing', '3–6 months'],
    ]);
  });
});
