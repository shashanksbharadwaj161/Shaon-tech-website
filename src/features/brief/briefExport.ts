/**
 * Project brief — file export.
 *
 * Builders are pure (data + timestamp in, string out) and tested. The single
 * DOM helper, `downloadFile`, hands a file to the visitor's own browser.
 * Nothing is sent anywhere.
 */
import {
  BUDGET_HINT,
  NOT_PROVIDED,
  budgetCurrency,
  projectTypeLabel,
  rangeLabel,
  stepTitle,
  timingLabel,
  type BriefData,
  type BudgetRange,
  type Currency,
  type ProjectType,
  type Timing,
} from './briefModel';

export const BRIEF_FORMAT = 'shaon-tech-project-brief';
export const BRIEF_VERSION = 1;
export const DELIVERY_LINE = "Not sent. Created and downloaded in the visitor's browser.";

export const JSON_MIME = 'application/json;charset=utf-8';
export const TEXT_MIME = 'text/plain;charset=utf-8';

export type ExportFormat = 'json' | 'txt';

export interface BriefExport {
  format: typeof BRIEF_FORMAT;
  version: typeof BRIEF_VERSION;
  createdAt: string;
  project: { type: ProjectType | null; typeLabel: string | null; goals: string };
  budget: { currency: Currency | null; range: BudgetRange | null; rangeLabel: string | null };
  timing: { value: Timing | null; label: string | null };
  contact: { name: string; email: string; company: string | null };
  delivery: typeof DELIVERY_LINE;
}

/** Text as it will be written to a file: trimmed, with consistent newlines. */
function clean(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

/** The brief as a plain object, with every skipped optional answer as null. */
export function briefToExport(data: BriefData, createdAtISO: string): BriefExport {
  const company = clean(data.company);
  return {
    format: BRIEF_FORMAT,
    version: BRIEF_VERSION,
    createdAt: createdAtISO,
    project: {
      type: data.projectType,
      typeLabel: projectTypeLabel(data.projectType),
      goals: clean(data.goals),
    },
    budget: {
      currency: budgetCurrency(data),
      range: data.budgetRange,
      rangeLabel: rangeLabel(data.budgetRange),
    },
    timing: {
      value: data.timing,
      label: timingLabel(data.timing),
    },
    contact: {
      name: clean(data.name),
      email: clean(data.email),
      company: company === '' ? null : company,
    },
    delivery: DELIVERY_LINE,
  };
}

/** Pretty-printed JSON (2-space indent) with a trailing newline. */
export function buildBriefJson(data: BriefData, createdAtISO: string): string {
  return `${JSON.stringify(briefToExport(data, createdAtISO), null, 2)}\n`;
}

function heading(title: string): string[] {
  const upper = title.toUpperCase();
  return [upper, '-'.repeat(upper.length)];
}

function line(label: string, value: string | null): string {
  return `${label}: ${value ?? NOT_PROVIDED}`;
}

function indented(text: string): string[] {
  return text.split('\n').map((l) => (l.trim() === '' ? '' : `  ${l}`));
}

/** A readable plain-text version of the brief (UTF-8, LF line endings). */
export function buildBriefText(data: BriefData, createdAtISO: string): string {
  const brief = briefToExport(data, createdAtISO);
  const title = 'ShaOn Tech — project brief';
  const goals = brief.project.goals === '' ? [`  ${NOT_PROVIDED}`] : indented(brief.project.goals);

  const lines = [
    title,
    '='.repeat(title.length),
    line('Created', brief.createdAt),
    line('Delivery', brief.delivery),
    '',
    ...heading(stepTitle(1)),
    line('What do you need?', brief.project.typeLabel),
    'What should it achieve?',
    ...goals,
    '',
    ...heading(stepTitle(2)),
    line('Budget currency', brief.budget.currency),
    line('Budget range', brief.budget.rangeLabel),
    line('Timing', brief.timing.label),
    `Note: ${BUDGET_HINT}`,
    '',
    ...heading('Your details'),
    line('Name', brief.contact.name || null),
    line('Email', brief.contact.email || null),
    line('Company', brief.contact.company),
  ];
  return `${lines.join('\n')}\n`;
}

/** 'shaon-tech-brief-YYYY-MM-DD.json' — the date is the calendar date written in the timestamp. */
export function briefFilename(ext: ExportFormat, createdAtISO: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(createdAtISO);
  let date = match?.[1];
  if (date === undefined) {
    const parsed = new Date(createdAtISO);
    if (Number.isNaN(parsed.getTime())) throw new RangeError(`Not an ISO timestamp: ${createdAtISO}`);
    date = parsed.toISOString().slice(0, 10);
  }
  return `shaon-tech-brief-${date}.${ext}`;
}

const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');

/**
 * ISO 8601 timestamp in the visitor's own time zone, e.g.
 * '2026-10-04T08:30:00+09:00', so the file date matches their calendar.
 * `offsetMinutes` is minutes ahead of UTC (the opposite sign of getTimezoneOffset).
 */
export function localIsoTimestamp(date: Date, offsetMinutes: number = -date.getTimezoneOffset()): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const offset = `${sign}${pad(offsetMinutes / 60)}:${pad(offsetMinutes % 60)}`;
  return `${shifted.toISOString().slice(0, 19)}${offset}`;
}

/** Everything needed to save one file. */
export interface BriefFile {
  filename: string;
  content: string;
  mime: string;
}

export function buildBriefFile(format: ExportFormat, data: BriefData, createdAtISO: string): BriefFile {
  return format === 'json'
    ? { filename: briefFilename('json', createdAtISO), content: buildBriefJson(data, createdAtISO), mime: JSON_MIME }
    : { filename: briefFilename('txt', createdAtISO), content: buildBriefText(data, createdAtISO), mime: TEXT_MIME };
}

/** How long the object URL stays alive after the click, so the browser can start the download. */
const REVOKE_DELAY_MS = 1000;

/**
 * Saves `content` as a file through the browser's own download: a Blob, an
 * object URL and a temporary <a download> that is clicked and removed. The URL
 * is revoked afterwards. No network request is made.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}
