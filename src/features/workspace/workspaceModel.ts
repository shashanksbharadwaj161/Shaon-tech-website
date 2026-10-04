/**
 * Pure filtering logic for the product workspace concept.
 *
 * Facets combine with AND. Within the status facet, selected statuses combine
 * with OR. Faceted counts ignore their own facet so each option shows how many
 * tasks it would return with every other filter left as it is.
 */
import { CATEGORIES, DUE_LABELS, STATUSES, type Category, type Task, type TaskStatus } from './workspaceData';

export type CategoryFilter = Category | 'all';

export interface WorkspaceFilters {
  /** Raw search text as typed; normalised when matching. */
  readonly query: string;
  /** Selected statuses, kept in canonical order. Empty means every status. */
  readonly statuses: readonly TaskStatus[];
  readonly category: CategoryFilter;
}

export const DEFAULT_FILTERS: WorkspaceFilters = Object.freeze({
  query: '',
  statuses: Object.freeze([]) as readonly TaskStatus[],
  category: 'all',
});

export interface StatusColumn {
  readonly status: TaskStatus;
  readonly tasks: readonly Task[];
}

export interface TextPart {
  readonly text: string;
  readonly match: boolean;
}

type Facet = 'status' | 'category';

/** Trim, collapse inner whitespace runs to one space and lower-case. */
export function normaliseQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The query as it should be read back to people: trimmed, single-spaced, original case. */
function displayQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ');
}

function matches(task: Task, filters: WorkspaceFilters, ignore?: Facet): boolean {
  const query = normaliseQuery(filters.query);
  if (query !== '' && !normaliseQuery(task.title).includes(query)) return false;
  if (ignore !== 'status' && filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
  if (ignore !== 'category' && filters.category !== 'all' && task.category !== filters.category) return false;
  return true;
}

/** Tasks that satisfy every active filter, in their original order. */
export function filterTasks(tasks: readonly Task[], filters: WorkspaceFilters): Task[] {
  return tasks.filter((task) => matches(task, filters));
}

/** Per-status counts for search + category, ignoring the status facet itself. */
export function statusCounts(tasks: readonly Task[], filters: WorkspaceFilters): Record<TaskStatus, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  for (const task of tasks) {
    if (matches(task, filters, 'status')) counts[task.status] += 1;
  }
  return counts;
}

/** Per-category counts for search + status, ignoring the category facet itself. */
export function categoryCounts(tasks: readonly Task[], filters: WorkspaceFilters): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const task of tasks) {
    if (matches(task, filters, 'category')) counts[task.category] += 1;
  }
  return counts;
}

/** True when at least one filter narrows the list. A whitespace-only query does not. */
export function isFiltered(filters: WorkspaceFilters): boolean {
  return normaliseQuery(filters.query) !== '' || filters.statuses.length > 0 || filters.category !== 'all';
}

/** "A", "A or B", "A, B or C". */
function orList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * One readable phrase per active facet, always in the order status, category,
 * search, e.g. ["Status: Review or Done", "Category: Design"]. Empty when nothing
 * narrows the list (a whitespace-only query counts as nothing).
 */
export function activeFilterParts(filters: WorkspaceFilters): string[] {
  const parts: string[] = [];
  if (filters.statuses.length > 0) {
    const ordered = STATUSES.filter((s) => filters.statuses.includes(s));
    parts.push(`Status: ${orList(ordered)}`);
  }
  if (filters.category !== 'all') parts.push(`Category: ${filters.category}`);
  const query = displayQuery(filters.query);
  if (query !== '') parts.push(`Search: “${query}”`);
  return parts;
}

/**
 * A readable sentence of the active filters, e.g.
 * "Status: Review or Done · Category: Design · Search: “audit”".
 */
export function describeFilters(filters: WorkspaceFilters): string {
  const parts = activeFilterParts(filters);
  return parts.length > 0 ? parts.join(' · ') : 'No filters applied';
}

/** "Showing 7 of 24 sample tasks". */
export function resultSummary(shown: number, total: number): string {
  return `Showing ${shown} of ${total} sample ${total === 1 ? 'task' : 'tasks'}`;
}

/** Add or remove a status, keeping the selection in canonical order. */
export function toggleStatus(filters: WorkspaceFilters, status: TaskStatus): WorkspaceFilters {
  const selected = new Set(filters.statuses);
  if (selected.has(status)) selected.delete(status);
  else selected.add(status);
  return { ...filters, statuses: STATUSES.filter((s) => selected.has(s)) };
}

/** Parse a <select> value; anything unknown falls back to every category. */
export function toCategoryFilter(value: string): CategoryFilter {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : 'all';
}

/**
 * Board columns: one per status that has tasks, in canonical status order.
 * Within a column, tasks are ordered by due date (nearest first); ties keep input order.
 */
export function groupByStatus(tasks: readonly Task[]): StatusColumn[] {
  return STATUSES.map((status) => ({
    status,
    tasks: tasks
      .filter((t) => t.status === status)
      .map((task, index) => ({ task, index }))
      .sort((a, b) => DUE_LABELS.indexOf(a.task.due) - DUE_LABELS.indexOf(b.task.due) || a.index - b.index)
      .map(({ task }) => task),
  })).filter((column) => column.tasks.length > 0);
}

/**
 * Split a title into plain and matching parts so the search term can be marked.
 * Case-insensitive; every non-overlapping occurrence is marked.
 */
export function highlightParts(title: string, query: string): TextPart[] {
  const needle = normaliseQuery(query);
  const haystack = title.toLowerCase();
  if (needle === '' || haystack.length !== title.length) return [{ text: title, match: false }];

  const parts: TextPart[] = [];
  let cursor = 0;
  let found = haystack.indexOf(needle);
  while (found !== -1) {
    if (found > cursor) parts.push({ text: title.slice(cursor, found), match: false });
    parts.push({ text: title.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
    found = haystack.indexOf(needle, cursor);
  }
  if (cursor < title.length) parts.push({ text: title.slice(cursor), match: false });
  return parts;
}
