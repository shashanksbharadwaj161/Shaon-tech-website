import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CATEGORIES, STATUSES, TASKS, type Task, type TaskStatus } from './workspaceData';
import {
  DEFAULT_FILTERS,
  activeFilterParts,
  categoryCounts,
  describeFilters,
  filterTasks,
  groupByStatus,
  highlightParts,
  isFiltered,
  resultSummary,
  statusCounts,
  toCategoryFilter,
  toggleStatus,
  type WorkspaceFilters,
} from './workspaceModel';
import './workspace.css';

/** How long typing must pause before the result count is announced. */
const ANNOUNCE_DELAY_MS = 450;
/** Cards beyond this index enter together, so long lists never feel slow. */
const MAX_STAGGER = 8;

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function StatusGlyph({ status }: { status: TaskStatus }) {
  return (
    <svg className="ws-glyph" data-status={slug(status)} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      {status === 'Done' ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.9 8.3 7.1 10.4 11.2 6" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray={status === 'Backlog' ? '2.4 2.2' : undefined}
          />
          {status === 'In progress' && <path d="M8 4a4 4 0 0 1 0 8Z" fill="currentColor" />}
          {status === 'Review' && <path d="M8 4a4 4 0 1 1-4 4h4Z" fill="currentColor" />}
        </>
      )}
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg className="ws-search__icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 4.25 4.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TaskCard({ task, query, index }: { task: Task; query: string; index: number }) {
  return (
    <li className="ws-card" style={{ '--ws-i': Math.min(index, MAX_STAGGER) } as CSSProperties}>
      <p className="ws-card__title">
        {highlightParts(task.title, query).map((part, i) =>
          part.match ? (
            <mark key={i} className="ws-mark">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>
      <dl className="ws-card__meta">
        <div className="ws-card__project">
          <dt className="visually-hidden">Project</dt>
          <dd>{task.project}</dd>
        </div>
        <div>
          <dt className="visually-hidden">Category</dt>
          <dd className="ws-tag">{task.category}</dd>
        </div>
        <div className="ws-due" data-due={slug(task.due)}>
          <dt className="ws-due__label">Due</dt>
          <dd>{task.due}</dd>
        </div>
      </dl>
    </li>
  );
}

export function WorkspaceDemo() {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const searchId = `${uid}-search`;
  const searchHintId = `${uid}-search-hint`;
  const statusHintId = `${uid}-status-hint`;
  const categoryId = `${uid}-category`;
  const resultsId = `${uid}-results`;

  const [filters, setFilters] = useState<WorkspaceFilters>(DEFAULT_FILTERS);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterTasks(TASKS, filters), [filters]);
  const columns = useMemo(() => groupByStatus(visible), [visible]);
  const byStatus = useMemo(() => statusCounts(TASKS, filters), [filters]);
  const byCategory = useMemo(() => categoryCounts(TASKS, filters), [filters]);
  const allCategoriesCount = CATEGORIES.reduce((total, c) => total + byCategory[c], 0);

  const total = TASKS.length;
  const active = isFiltered(filters);
  const filterParts = activeFilterParts(filters);
  const description = describeFilters(filters);
  const summary = resultSummary(visible.length, total);
  const announcement = useDebouncedValue(`${summary}. ${description}.`, ANNOUNCE_DELAY_MS);

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    searchRef.current?.focus();
  };

  const boardStyle = {
    '--ws-cols': columns.length,
    '--ws-cols-md': Math.min(columns.length, 2),
  } as CSSProperties;

  return (
    <section className="ws theme-ink" aria-labelledby={headingId}>
      <header className="ws-head">
        <div className="ws-head__bar">
          <p className="mono ws-head__kicker">
            Workspace<span className="ws-head__crumb"> / All projects</span>
          </p>
          <span className="sample-label">Sample data</span>
        </div>
        <h3 id={headingId} className="ws-head__title">
          Sample workspace
        </h3>
        <p className="ws-head__lede">
          A task board for an imagined product team: {total} sample tasks across three sample projects. Search,
          combine status and category filters, and reset in one step. Nothing is saved.
        </p>
      </header>

      <div className="ws-filters" role="search" aria-label="Filter sample tasks">
        <div className="ws-filters__row">
          <div className="field">
            <label className="field__label" htmlFor={searchId}>
              Search tasks
            </label>
            <div className="ws-search">
              <SearchGlyph />
              <input
                ref={searchRef}
                id={searchId}
                className="input ws-search__input"
                type="search"
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="Try “audit” or “copy”"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={searchHintId}
                aria-controls={resultsId}
              />
            </div>
            <p className="field__hint" id={searchHintId}>
              Matches any part of a task title, in any letter case.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={categoryId}>
              Category
            </label>
            <select
              id={categoryId}
              className="select"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: toCategoryFilter(e.target.value) }))}
              aria-controls={resultsId}
            >
              <option value="all">All categories ({allCategoriesCount})</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category} ({byCategory[category]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="ws-facet" aria-describedby={statusHintId}>
          <legend className="field__label ws-facet__legend">Status</legend>
          <p className="field__hint" id={statusHintId}>
            Pick any number. None picked shows all.
          </p>
          <div className="ws-chips">
            {STATUSES.map((status) => {
              const pressed = filters.statuses.includes(status);
              const count = byStatus[status];
              return (
                <button
                  key={status}
                  type="button"
                  className="chip ws-chip"
                  aria-pressed={pressed}
                  aria-controls={resultsId}
                  data-empty={count === 0 ? 'true' : undefined}
                  onClick={() => setFilters((f) => toggleStatus(f, status))}
                >
                  <StatusGlyph status={status} />
                  <span>{status}</span>
                  <span key={count} className="chip__count value-pop">
                    {count}
                    <span className="visually-hidden">{count === 1 ? ' task' : ' tasks'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="ws-summary">
        <div className="ws-summary__text">
          <p className="ws-summary__count">
            Showing{' '}
            <span key={visible.length} className="value-pop ws-summary__num">
              {visible.length}
            </span>{' '}
            of {total} sample tasks
          </p>
          <p className="ws-summary__filters" data-active={active ? 'true' : 'false'}>
            {description}
          </p>
        </div>
        <button type="button" className="btn btn--ghost ws-reset" onClick={reset} disabled={!active}>
          Reset filters
        </button>
        <div className="ws-meter" aria-hidden="true">
          <span style={{ '--ws-ratio': total === 0 ? 0 : visible.length / total } as CSSProperties} />
        </div>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div id={resultsId} className="ws-results">
        {visible.length > 0 ? (
          <div className="ws-board" style={boardStyle}>
            {columns.map((column) => {
              const columnHeadingId = `${uid}-col-${slug(column.status)}`;
              return (
                <div key={column.status} className="ws-col">
                  <h4 id={columnHeadingId} className="ws-col__head">
                    <StatusGlyph status={column.status} />
                    <span className="ws-col__name">{column.status}</span>
                    <span key={column.tasks.length} className="ws-col__count value-pop">
                      {column.tasks.length}
                      <span className="visually-hidden">{column.tasks.length === 1 ? ' task' : ' tasks'}</span>
                    </span>
                  </h4>
                  {/* role="list" keeps list semantics in Safari, where the base reset removes list-style. */}
                  <ul className="ws-cards" role="list" aria-labelledby={columnHeadingId}>
                    {column.tasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} query={filters.query} index={index} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state ws-empty">
            <p className="mono ws-empty__kicker">0 of {total}</p>
            <strong>No sample tasks match these filters</strong>
            <ul className="ws-empty__filters" role="list" aria-label="Active filters">
              {filterParts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
            <p>Remove a filter, or reset to see all {total} sample tasks again.</p>
            {active && (
              <button type="button" className="btn btn--primary" onClick={reset}>
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mono ws-foot">Sample data · Filters run in this page only · Nothing is stored or sent</p>
    </section>
  );
}
