/**
 * Sample data for the product workspace concept.
 *
 * Everything here is invented for a studio concept: generic task titles for an
 * imagined product team, no real projects, people, companies or metrics.
 */

export const PROJECTS = ['Website refresh', 'Mobile onboarding', 'Design system'] as const;
export type Project = (typeof PROJECTS)[number];

export const CATEGORIES = ['Design', 'Engineering', 'Content', 'Research'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Canonical status order: the order of the board columns and the status chips. */
export const STATUSES = ['Backlog', 'In progress', 'Review', 'Done'] as const;
export type TaskStatus = (typeof STATUSES)[number];

/** Canonical due order: nearest first. */
export const DUE_LABELS = ['This week', 'Next week', 'Later'] as const;
export type Due = (typeof DUE_LABELS)[number];

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly project: Project;
  readonly category: Category;
  readonly status: TaskStatus;
  readonly due: Due;
}

export const TASKS: readonly Task[] = [
  { id: 'web-01', title: 'Audit navigation labels', project: 'Website refresh', category: 'Research', status: 'Done', due: 'This week' },
  { id: 'mob-01', title: 'Draft onboarding copy', project: 'Mobile onboarding', category: 'Content', status: 'In progress', due: 'This week' },
  { id: 'sys-01', title: 'Tokenise spacing scale', project: 'Design system', category: 'Design', status: 'In progress', due: 'This week' },
  { id: 'web-02', title: 'Redesign pricing table layout', project: 'Website refresh', category: 'Design', status: 'In progress', due: 'This week' },
  { id: 'mob-02', title: 'Prototype permission prompts', project: 'Mobile onboarding', category: 'Design', status: 'Review', due: 'This week' },
  { id: 'sys-02', title: 'Audit colour contrast pairs', project: 'Design system', category: 'Research', status: 'Review', due: 'This week' },
  { id: 'web-03', title: 'Rewrite homepage hero copy', project: 'Website refresh', category: 'Content', status: 'Review', due: 'This week' },
  { id: 'mob-03', title: 'Fix keyboard trap in welcome sheet', project: 'Mobile onboarding', category: 'Engineering', status: 'Review', due: 'This week' },
  { id: 'mob-04', title: 'Synthesise onboarding interview notes', project: 'Mobile onboarding', category: 'Research', status: 'Done', due: 'This week' },
  { id: 'web-04', title: 'Map redirects for retired pages', project: 'Website refresh', category: 'Engineering', status: 'In progress', due: 'Next week' },
  { id: 'sys-03', title: 'Document button variants', project: 'Design system', category: 'Content', status: 'Review', due: 'Next week' },
  { id: 'mob-05', title: 'Add progress indicator to setup steps', project: 'Mobile onboarding', category: 'Engineering', status: 'In progress', due: 'Next week' },
  { id: 'web-05', title: 'Interview visitors about search habits', project: 'Website refresh', category: 'Research', status: 'Backlog', due: 'Next week' },
  { id: 'mob-06', title: 'Design empty states for first run', project: 'Mobile onboarding', category: 'Design', status: 'Backlog', due: 'Next week' },
  { id: 'sys-04', title: 'Publish form field guidelines', project: 'Design system', category: 'Content', status: 'Backlog', due: 'Next week' },
  { id: 'web-06', title: 'Compress hero imagery', project: 'Website refresh', category: 'Engineering', status: 'Done', due: 'Next week' },
  { id: 'mob-07', title: 'Write notification opt-in text', project: 'Mobile onboarding', category: 'Content', status: 'Done', due: 'Next week' },
  { id: 'web-07', title: 'Migrate blog templates to components', project: 'Website refresh', category: 'Engineering', status: 'Backlog', due: 'Later' },
  { id: 'web-08', title: 'Draft accessibility statement', project: 'Website refresh', category: 'Content', status: 'Backlog', due: 'Later' },
  { id: 'sys-05', title: 'Unify icon stroke weights', project: 'Design system', category: 'Design', status: 'Backlog', due: 'Later' },
  { id: 'sys-06', title: 'Refactor modal focus handling', project: 'Design system', category: 'Engineering', status: 'Backlog', due: 'Later' },
  { id: 'mob-08', title: 'Test setup flow with screen readers', project: 'Mobile onboarding', category: 'Research', status: 'In progress', due: 'Later' },
  { id: 'sys-07', title: 'Build focus ring utility', project: 'Design system', category: 'Engineering', status: 'Done', due: 'Later' },
  { id: 'sys-08', title: 'Design data table density options', project: 'Design system', category: 'Design', status: 'Done', due: 'Later' },
];
