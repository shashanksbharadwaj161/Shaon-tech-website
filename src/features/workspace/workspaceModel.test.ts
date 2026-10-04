import { describe, expect, it } from 'vitest';
import { CATEGORIES, DUE_LABELS, PROJECTS, STATUSES, TASKS, type Task } from './workspaceData';
import {
  DEFAULT_FILTERS,
  activeFilterParts,
  categoryCounts,
  describeFilters,
  filterTasks,
  groupByStatus,
  highlightParts,
  isFiltered,
  normaliseQuery,
  resultSummary,
  statusCounts,
  toCategoryFilter,
  toggleStatus,
  type WorkspaceFilters,
} from './workspaceModel';

const f = (patch: Partial<WorkspaceFilters>): WorkspaceFilters => ({ ...DEFAULT_FILTERS, ...patch });
const ids = (tasks: readonly Task[]) => tasks.map((t) => t.id).sort();
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/** A tiny fixture so expectations do not depend on the sample copy. */
const FIXTURE: Task[] = [
  { id: 'a', title: 'Audit navigation labels', project: 'Website refresh', category: 'Research', status: 'Done', due: 'Later' },
  { id: 'b', title: 'Draft onboarding copy', project: 'Mobile onboarding', category: 'Content', status: 'Review', due: 'This week' },
  { id: 'c', title: 'AUDIT colour pairs', project: 'Design system', category: 'Research', status: 'Review', due: 'Next week' },
  { id: 'd', title: 'Tokenise spacing scale', project: 'Design system', category: 'Design', status: 'Backlog', due: 'This week' },
  { id: 'e', title: 'Audit icon set', project: 'Design system', category: 'Design', status: 'In progress', due: 'Later' },
  { id: 'f', title: 'Write release notes', project: 'Website refresh', category: 'Content', status: 'Done', due: 'This week' },
];

describe('sample data invariants', () => {
  it('has about two dozen tasks with unique ids', () => {
    expect(TASKS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
  });

  it('only uses known projects, categories, statuses and due labels', () => {
    for (const task of TASKS) {
      expect(PROJECTS).toContain(task.project);
      expect(CATEGORIES).toContain(task.category);
      expect(STATUSES).toContain(task.status);
      expect(DUE_LABELS).toContain(task.due);
      expect(task.title.trim()).toBe(task.title);
      expect(task.title.length).toBeGreaterThan(0);
    }
  });

  it('gives every status, category and project several tasks', () => {
    for (const status of STATUSES) expect(TASKS.filter((t) => t.status === status).length).toBeGreaterThanOrEqual(3);
    for (const category of CATEGORIES) expect(TASKS.filter((t) => t.category === category).length).toBeGreaterThanOrEqual(3);
    for (const project of PROJECTS) expect(TASKS.filter((t) => t.project === project).length).toBeGreaterThanOrEqual(3);
  });
});

describe('normaliseQuery', () => {
  it('trims, lower-cases and collapses inner whitespace', () => {
    expect(normaliseQuery('  Audit   NAV \t')).toBe('audit nav');
    expect(normaliseQuery(' \n\t ')).toBe('');
  });
});

describe('search', () => {
  it('matches title substrings case-insensitively and ignores surrounding whitespace', () => {
    expect(ids(filterTasks(FIXTURE, f({ query: 'audit' })))).toEqual(['a', 'c', 'e']);
    expect(ids(filterTasks(FIXTURE, f({ query: '  aUdIt  ' })))).toEqual(['a', 'c', 'e']);
    expect(ids(filterTasks(FIXTURE, f({ query: 'boarding co' })))).toEqual(['b']);
  });

  it('treats a whitespace-only query as no filter', () => {
    const filters = f({ query: '   ' });
    expect(filterTasks(FIXTURE, filters)).toEqual(FIXTURE);
    expect(isFiltered(filters)).toBe(false);
  });

  it('matches only the title, not project or category', () => {
    expect(filterTasks(FIXTURE, f({ query: 'research' }))).toEqual([]);
    expect(filterTasks(FIXTURE, f({ query: 'design system' }))).toEqual([]);
  });
});

describe('status and category facets', () => {
  it('ORs selected statuses together', () => {
    expect(ids(filterTasks(FIXTURE, f({ statuses: ['Review'] })))).toEqual(['b', 'c']);
    expect(ids(filterTasks(FIXTURE, f({ statuses: ['Review', 'Done'] })))).toEqual(['a', 'b', 'c', 'f']);
  });

  it('ANDs status with category and search', () => {
    expect(ids(filterTasks(FIXTURE, f({ statuses: ['Review', 'Done'], category: 'Research' })))).toEqual(['a', 'c']);
    expect(ids(filterTasks(FIXTURE, f({ statuses: ['Review', 'Done'], category: 'Research', query: 'colour' })))).toEqual([
      'c',
    ]);
  });

  it('returns an empty list when the facets exclude each other', () => {
    expect(filterTasks(FIXTURE, f({ statuses: ['Backlog'], category: 'Content' }))).toEqual([]);
    expect(filterTasks(TASKS, f({ query: 'no task is called this' }))).toEqual([]);
  });

  it('preserves the input order of matching tasks', () => {
    expect(filterTasks(FIXTURE, f({ category: 'Content' })).map((t) => t.id)).toEqual(['b', 'f']);
  });

  it('returns the full list for the default (reset) filters', () => {
    expect(filterTasks(TASKS, DEFAULT_FILTERS)).toEqual([...TASKS]);
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
  });
});

describe('faceted counts', () => {
  it('status counts ignore the status facet but respect search and category', () => {
    const filters = f({ statuses: ['Done'], category: 'Research', query: 'audit' });
    expect(statusCounts(FIXTURE, filters)).toEqual({ Backlog: 0, 'In progress': 0, Review: 1, Done: 1 });
    // Selecting a different status does not change the status counts.
    expect(statusCounts(FIXTURE, { ...filters, statuses: ['Backlog'] })).toEqual(statusCounts(FIXTURE, filters));
  });

  it('category counts ignore the category facet but respect search and status', () => {
    const filters = f({ statuses: ['Review', 'In progress'], category: 'Content', query: 'audit' });
    expect(categoryCounts(FIXTURE, filters)).toEqual({ Design: 1, Engineering: 0, Content: 0, Research: 1 });
    expect(categoryCounts(FIXTURE, { ...filters, category: 'all' })).toEqual(categoryCounts(FIXTURE, filters));
  });

  it('status counts sum to the tasks matching search + category', () => {
    const cases: WorkspaceFilters[] = [
      DEFAULT_FILTERS,
      f({ query: 'audit' }),
      f({ category: 'Design', statuses: ['Done'] }),
      f({ query: ' a ', category: 'Engineering', statuses: ['Review', 'Backlog'] }),
    ];
    for (const filters of cases) {
      const searchAndCategory = filterTasks(TASKS, { ...filters, statuses: [] });
      expect(sum(statusCounts(TASKS, filters))).toBe(searchAndCategory.length);
      const searchAndStatus = filterTasks(TASKS, { ...filters, category: 'all' });
      expect(sum(categoryCounts(TASKS, filters))).toBe(searchAndStatus.length);
    }
  });

  it('a status count equals the result size of selecting only that status', () => {
    const base = f({ query: 'e', category: 'Engineering' });
    const counts = statusCounts(TASKS, base);
    for (const status of STATUSES) {
      expect(filterTasks(TASKS, { ...base, statuses: [status] }).length).toBe(counts[status]);
    }
  });

  it('counts every status and category at zero when search excludes everything', () => {
    const filters = f({ query: 'zzz' });
    expect(sum(statusCounts(TASKS, filters))).toBe(0);
    expect(sum(categoryCounts(TASKS, filters))).toBe(0);
  });
});

describe('isFiltered', () => {
  it('is true when any single facet is active', () => {
    expect(isFiltered(f({ query: 'a' }))).toBe(true);
    expect(isFiltered(f({ statuses: ['Done'] }))).toBe(true);
    expect(isFiltered(f({ category: 'Design' }))).toBe(true);
  });
});

describe('describeFilters', () => {
  it('says so when nothing is filtered', () => {
    expect(describeFilters(DEFAULT_FILTERS)).toBe('No filters applied');
    expect(describeFilters(f({ query: '   ' }))).toBe('No filters applied');
  });

  it('reads back every active facet in a fixed order with the trimmed query', () => {
    expect(describeFilters(f({ statuses: ['Done', 'Review'], category: 'Design', query: '  audit ' }))).toBe(
      'Status: Review or Done · Category: Design · Search: “audit”',
    );
  });

  it('lists three or more statuses with commas and a final “or”, in canonical order', () => {
    expect(describeFilters(f({ statuses: ['Done', 'Backlog', 'Review'] }))).toBe('Status: Backlog, Review or Done');
  });

  it('keeps the original case of the search text', () => {
    expect(describeFilters(f({ query: 'Hero  Copy' }))).toBe('Search: “Hero Copy”');
  });
});

describe('activeFilterParts', () => {
  it('is empty for the reset filters and for a whitespace-only query', () => {
    expect(activeFilterParts(DEFAULT_FILTERS)).toEqual([]);
    expect(activeFilterParts(f({ query: ' \t ' }))).toEqual([]);
  });

  it('gives one phrase per active facet, in a fixed order whatever the selection order', () => {
    expect(activeFilterParts(f({ query: 'copy', category: 'Content', statuses: ['Done', 'Backlog'] }))).toEqual([
      'Status: Backlog or Done',
      'Category: Content',
      'Search: “copy”',
    ]);
    expect(activeFilterParts(f({ category: 'Research' }))).toEqual(['Category: Research']);
  });

  it('is what describeFilters reads back, joined', () => {
    const filters = f({ query: 'audit', statuses: ['Review'] });
    expect(describeFilters(filters)).toBe(activeFilterParts(filters).join(' · '));
  });
});

describe('resultSummary', () => {
  it('states shown and total counts', () => {
    expect(resultSummary(7, 24)).toBe('Showing 7 of 24 sample tasks');
    expect(resultSummary(0, 24)).toBe('Showing 0 of 24 sample tasks');
  });
});

describe('toggleStatus', () => {
  it('adds and removes statuses, keeping canonical order', () => {
    let filters = toggleStatus(DEFAULT_FILTERS, 'Done');
    filters = toggleStatus(filters, 'Backlog');
    expect(filters.statuses).toEqual(['Backlog', 'Done']);
    filters = toggleStatus(filters, 'Done');
    expect(filters.statuses).toEqual(['Backlog']);
    filters = toggleStatus(filters, 'Backlog');
    expect(isFiltered(filters)).toBe(false);
  });

  it('does not mutate the filters it was given', () => {
    const before = f({ statuses: ['Review'] });
    toggleStatus(before, 'Done');
    expect(before.statuses).toEqual(['Review']);
    expect(DEFAULT_FILTERS.statuses).toEqual([]);
  });
});

describe('toCategoryFilter', () => {
  it('accepts known categories and falls back to all', () => {
    expect(toCategoryFilter('Research')).toBe('Research');
    expect(toCategoryFilter('all')).toBe('all');
    expect(toCategoryFilter('research')).toBe('all');
    expect(toCategoryFilter('')).toBe('all');
  });
});

describe('groupByStatus', () => {
  it('only creates columns for statuses with tasks, in canonical order', () => {
    const columns = groupByStatus(filterTasks(FIXTURE, f({ statuses: ['Done', 'Backlog'] })));
    expect(columns.map((c) => c.status)).toEqual(['Backlog', 'Done']);
    expect(groupByStatus([])).toEqual([]);
  });

  it('orders each column by due date, keeping input order for ties', () => {
    const tasks: Task[] = [
      { ...FIXTURE[0], id: 'later', due: 'Later', status: 'Review' },
      { ...FIXTURE[0], id: 'week-1', due: 'This week', status: 'Review' },
      { ...FIXTURE[0], id: 'next', due: 'Next week', status: 'Review' },
      { ...FIXTURE[0], id: 'week-2', due: 'This week', status: 'Review' },
    ];
    expect(groupByStatus(tasks)[0].tasks.map((t) => t.id)).toEqual(['week-1', 'week-2', 'next', 'later']);
  });

  it('places every task in exactly one column', () => {
    const columns = groupByStatus(TASKS);
    expect(columns.map((c) => c.status)).toEqual([...STATUSES]);
    expect(columns.flatMap((c) => c.tasks.map((t) => t.id)).sort()).toEqual(ids(TASKS));
  });
});

describe('highlightParts', () => {
  it('marks every case-insensitive occurrence and keeps the original text', () => {
    const parts = highlightParts('Audit the audit log', ' AUDIT ');
    expect(parts).toEqual([
      { text: 'Audit', match: true },
      { text: ' the ', match: false },
      { text: 'audit', match: true },
      { text: ' log', match: false },
    ]);
    expect(parts.map((p) => p.text).join('')).toBe('Audit the audit log');
  });

  it('returns the whole title unmarked for an empty query or no match', () => {
    expect(highlightParts('Draft copy', '  ')).toEqual([{ text: 'Draft copy', match: false }]);
    expect(highlightParts('Draft copy', 'zzz')).toEqual([{ text: 'Draft copy', match: false }]);
  });
});
