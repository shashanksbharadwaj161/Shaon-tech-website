/**
 * Project brief — answers, option lists and validation.
 *
 * Pure data and functions only (no React, no DOM) so every rule can be tested
 * in isolation. Nothing here sends or stores anything: the brief lives in
 * memory until the visitor downloads it.
 */

export type Step = 1 | 2 | 3;

export type ProjectType = 'website' | 'app' | 'both' | 'unsure';
export type Currency = 'USD' | 'JPY';
export type UsdRange = 'usd-under-5000' | 'usd-5000-15000' | 'usd-15000-30000' | 'usd-30000-plus';
export type JpyRange = 'jpy-under-500000' | 'jpy-500000-1500000' | 'jpy-1500000-3000000' | 'jpy-3000000-plus';
export type BudgetRange = UsdRange | JpyRange | 'not-sure';
export type Timing = 'under-1-month' | '1-3-months' | '3-6-months' | '6-plus-months' | 'not-sure';

export interface BriefData {
  projectType: ProjectType | null;
  goals: string;
  /** Currency the budget ranges are shown in. Only exported when a range is chosen. */
  currency: Currency;
  budgetRange: BudgetRange | null;
  timing: Timing | null;
  name: string;
  email: string;
  company: string;
}

export type BriefField = keyof BriefData;
export type FieldErrors = Partial<Record<BriefField, string>>;

export interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export const STEPS: readonly { readonly step: Step; readonly title: string; readonly summary: string }[] = [
  { step: 1, title: 'Project & goals', summary: 'What you want to make and what it should achieve.' },
  { step: 2, title: 'Budget & timing', summary: 'Optional. A rough range in USD or JPY, or “not sure”.' },
  { step: 3, title: 'Review & download', summary: 'Your details, a final check, then a JSON or text file to keep.' },
];

export const GOALS_MAX = 2000;
export const NOT_PROVIDED = 'Not provided';
export const BUDGET_HINT =
  'Budget ranges are only categories to help us understand scope — not rates, quotes or currency conversions.';

export const PROJECT_TYPES: readonly Option<ProjectType>[] = [
  { value: 'website', label: 'A website' },
  { value: 'app', label: 'An app' },
  { value: 'both', label: 'Both' },
  { value: 'unsure', label: 'Not sure yet' },
];

export const CURRENCIES: readonly Option<Currency>[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

const NOT_SURE_RANGE: Option<'not-sure'> = { value: 'not-sure', label: 'Not sure' };

export const USD_RANGES: readonly Option<UsdRange | 'not-sure'>[] = [
  { value: 'usd-under-5000', label: 'Under $5,000' },
  { value: 'usd-5000-15000', label: '$5,000–$15,000' },
  { value: 'usd-15000-30000', label: '$15,000–$30,000' },
  { value: 'usd-30000-plus', label: '$30,000+' },
  NOT_SURE_RANGE,
];

export const JPY_RANGES: readonly Option<JpyRange | 'not-sure'>[] = [
  { value: 'jpy-under-500000', label: 'Under ¥500,000' },
  { value: 'jpy-500000-1500000', label: '¥500,000–¥1,500,000' },
  { value: 'jpy-1500000-3000000', label: '¥1,500,000–¥3,000,000' },
  { value: 'jpy-3000000-plus', label: '¥3,000,000+' },
  NOT_SURE_RANGE,
];

export const TIMINGS: readonly Option<Timing>[] = [
  { value: 'under-1-month', label: 'Under 1 month' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: '6-plus-months', label: '6+ months' },
  { value: 'not-sure', label: 'Not sure' },
];

export const EMPTY_BRIEF: BriefData = Object.freeze({
  projectType: null,
  goals: '',
  currency: 'USD',
  budgetRange: null,
  timing: null,
  name: '',
  email: '',
  company: '',
});

/** Fields in the order they appear on each step; drives error and focus order. */
export const STEP_FIELDS: Readonly<Record<Step, readonly BriefField[]>> = {
  1: ['projectType', 'goals'],
  2: ['currency', 'budgetRange', 'timing'],
  3: ['name', 'email', 'company'],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Characters as a person counts them (code points, so emoji and kanji count once), after trimming. */
export function characterCount(text: string): number {
  return [...text.trim()].length;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

const formatCount = (n: number) => n.toLocaleString('en-US');

function fieldError(field: BriefField, data: BriefData): string | null {
  switch (field) {
    case 'projectType':
      return data.projectType === null ? 'Choose what you need.' : null;
    case 'goals': {
      const count = characterCount(data.goals);
      if (count === 0) return 'Tell us what it should achieve.';
      if (count > GOALS_MAX) {
        const over = count - GOALS_MAX;
        return `Keep it to ${formatCount(GOALS_MAX)} characters or fewer — ${formatCount(over)} ${over === 1 ? 'character' : 'characters'} too many.`;
      }
      return null;
    }
    case 'name':
      return data.name.trim() === '' ? 'Enter your name.' : null;
    case 'email':
      if (data.email.trim() === '') return 'Enter your email address.';
      return isValidEmail(data.email) ? null : 'Enter an email address in the format name@example.com.';
    // Everything on step 2, and the company name, is optional.
    case 'currency':
    case 'budgetRange':
    case 'timing':
    case 'company':
      return null;
  }
}

/** Errors for one step, keyed by field and inserted in on-screen order. Empty when the step is valid. */
export function validateStep(step: Step, data: BriefData): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const message = fieldError(field, data);
    if (message !== null) errors[field] = message;
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** The first field on `step` (in on-screen order) that has an error, or null. */
export function firstInvalidField(step: Step, errors: FieldErrors): BriefField | null {
  return STEP_FIELDS[step].find((field) => errors[field] !== undefined) ?? null;
}

/**
 * Re-checks only the fields that are already showing an error, so an error
 * clears (or its message updates) as the visitor fixes it, without new errors
 * appearing on fields they have not finished with yet.
 */
export function revalidateErrors(previous: FieldErrors, step: Step, data: BriefData): FieldErrors {
  const current = validateStep(step, data);
  const next: FieldErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const message = current[field];
    if (previous[field] !== undefined && message !== undefined) next[field] = message;
  }
  return next;
}

export function budgetOptions(currency: Currency): readonly Option<BudgetRange>[] {
  return currency === 'USD' ? USD_RANGES : JPY_RANGES;
}

/** The currency a range belongs to, or null for 'not-sure', which fits either. */
export function rangeCurrency(range: BudgetRange): Currency | null {
  if (range.startsWith('usd-')) return 'USD';
  if (range.startsWith('jpy-')) return 'JPY';
  return null;
}

export function isRangeCompatible(range: BudgetRange, currency: Currency): boolean {
  const owner = rangeCurrency(range);
  return owner === null || owner === currency;
}

/** Switches currency, clearing a selected range that belongs to the other currency. 'not-sure' is kept. */
export function setCurrency(data: BriefData, currency: Currency): BriefData {
  if (data.currency === currency) return data;
  const budgetRange = data.budgetRange !== null && isRangeCompatible(data.budgetRange, currency) ? data.budgetRange : null;
  return { ...data, currency, budgetRange };
}

function labelFrom<T extends string>(options: readonly Option<T>[], value: T | null): string | null {
  if (value === null) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

export function projectTypeLabel(type: ProjectType | null): string | null {
  return labelFrom(PROJECT_TYPES, type);
}

export function rangeLabel(range: BudgetRange | null): string | null {
  return labelFrom<BudgetRange>([...USD_RANGES, ...JPY_RANGES], range);
}

export function timingLabel(timing: Timing | null): string | null {
  return labelFrom(TIMINGS, timing);
}

/**
 * The currency a brief's budget is expressed in: null when no range was chosen,
 * otherwise the range's own currency (or the selected currency for 'not-sure').
 */
export function budgetCurrency(data: BriefData): Currency | null {
  if (data.budgetRange === null) return null;
  return rangeCurrency(data.budgetRange) ?? data.currency;
}

export function stepTitle(step: Step): string {
  return STEPS[step - 1].title;
}
