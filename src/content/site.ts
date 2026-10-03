/**
 * All visitor-facing copy lives here so it can be edited without touching layout
 * or motion code. Keep it factual: no invented clients, testimonials, metrics,
 * studio history, city or email address. Anything that is not real client work
 * must be labelled as a studio concept.
 */

export type SectionId = 'work' | 'services' | 'lab' | 'studio' | 'start';

export interface NavItem {
  id: SectionId;
  label: string;
}

export interface LinkAction {
  label: string;
  href: `#${string}`;
}

export interface StoryChapter {
  id: 'idea' | 'signal' | 'structure' | 'product';
  index: string;
  kicker: string;
  title: string;
  body: string;
}

export interface Service {
  index: string;
  title: string;
  body: string;
  includes: string[];
}

export interface StudioConcept {
  index: string;
  title: string;
  kind: string;
  summary: string;
  explores: string[];
  status: string;
}

export interface BriefStep {
  index: string;
  title: string;
  body: string;
}

export const site = {
  name: 'ShaOn Tech',
  nameParts: { strong: 'ShaOn', light: 'Tech' },
  descriptor: 'Website and app design / development studio',

  nav: [
    { id: 'work', label: 'Work' },
    { id: 'services', label: 'Services' },
    { id: 'lab', label: 'Lab' },
    { id: 'studio', label: 'Studio' },
  ] satisfies NavItem[],
  navCta: { label: 'Start a project', href: '#start' } satisfies LinkAction,

  hero: {
    labelTop: ['Website', 'and app', 'design /', 'development', 'studio'],
    headline: { lead: 'Ideas into', accent: 'living', tail: 'products', stop: '.' },
    body: 'ShaOn Tech designs and develops websites and apps. Based in Japan. Built for businesses everywhere.',
    primary: { label: 'Start a project', href: '#start' } satisfies LinkAction,
    secondary: { label: 'Explore the work', href: '#work' } satisfies LinkAction,
    asideTop: ['Design', 'Develop', 'Launch', 'Together'],
    asideBottom: ['Ideas into', 'living products.'],
    belief: 'A more human internet builds a brighter tomorrow.',
    scrollCue: 'Scroll to unfold',
  },

  story: {
    label: 'From an idea to a living product',
    skip: 'Skip the sequence',
    chapters: [
      {
        id: 'idea',
        index: '01',
        kicker: 'Idea',
        title: 'Start with the idea.',
        body: 'We begin with what you want to make, who it is for and what it needs to change — a clear, shared definition before anything is drawn.',
      },
      {
        id: 'signal',
        index: '02',
        kicker: 'Signal',
        title: 'Find the signal.',
        body: 'The idea is unfolded into its essential parts: content, journeys, features and constraints. We keep what matters and let the noise go.',
      },
      {
        id: 'structure',
        index: '03',
        kicker: 'Structure',
        title: 'Give it structure.',
        body: 'Signals settle into wireframes, flows and a system of components that can be reviewed, tested and refined early.',
      },
      {
        id: 'product',
        index: '04',
        kicker: 'Product',
        title: 'Ship a living product.',
        body: 'Design and code come together as a fast, accessible website or app — ready to launch, learn from and keep improving.',
      },
    ] satisfies StoryChapter[],
    previewLabel: 'Studio concept — illustrative interface, not client work',
  },

  work: {
    eyebrow: 'Work',
    title: 'Studio concepts',
    intro:
      'Self-initiated prototypes that show how we think about real product problems. They are studio concepts, not client work, and use sample data only.',
    concepts: [
      {
        index: 'C—01',
        title: 'Dashboard filtering',
        kind: 'SaaS dashboard',
        summary: 'Filtering a dense dashboard so results stay legible and every step can be undone.',
        explores: ['Faceted filters', 'Saved views', 'Empty states'],
        status: 'Interactive concept in progress',
      },
      {
        index: 'C—02',
        title: 'Variant & cart',
        kind: 'Commerce',
        summary: 'Choosing a product variant and editing a cart with totals that are never ambiguous.',
        explores: ['Variant selection', 'Cart editing', 'Clear totals'],
        status: 'Interactive concept in progress',
      },
      {
        index: 'C—03',
        title: 'Availability explorer',
        kind: 'Hospitality',
        summary: 'Exploring dates and rooms against sample availability data without friction.',
        explores: ['Date ranges', 'Room comparison', 'Sample data'],
        status: 'Interactive concept in progress',
      },
    ] satisfies StudioConcept[],
  },

  services: {
    eyebrow: 'Services',
    title: 'Design. Develop. Launch. Together.',
    intro: 'ShaOn Tech designs and develops websites and apps, and takes them live with you.',
    items: [
      {
        index: '01',
        title: 'Design',
        body: 'Websites and app interfaces: structure, visual direction and motion, shaped around the idea.',
        includes: ['Websites', 'App interfaces', 'Motion'],
      },
      {
        index: '02',
        title: 'Develop',
        body: 'The same designs built as real, responsive websites and apps — accessible and ready to grow.',
        includes: ['Front-end', 'Responsive builds', 'Accessibility'],
      },
      {
        index: '03',
        title: 'Launch',
        body: 'Taking the product live together, then refining it as it meets the people it was made for.',
        includes: ['Release', 'Refinement'],
      },
    ] satisfies Service[],
  },

  lab: {
    eyebrow: 'Lab',
    title: 'Material, light and signal.',
    body: 'The Lab is where we test the real-time graphics behind this site: chrome, light and particle systems you will be able to tune yourself.',
    note: 'Studio experiment — the visitor-controlled lab is being prepared.',
    hint: 'Move across the field',
  },

  studio: {
    eyebrow: 'Studio',
    title: 'An independent studio based in Japan.',
    paragraphs: [
      'ShaOn Tech designs and develops websites and apps for businesses everywhere.',
      'From an idea to a living product — a more human internet builds a brighter tomorrow.',
    ],
    facts: [
      { label: 'Based in', value: 'Japan' },
      { label: 'Practice', value: 'Websites and apps' },
      { label: 'Studio', value: 'Independent' },
    ],
  },

  start: {
    eyebrow: 'Start a project',
    title: 'Tell us what you want to build.',
    body: 'A short, three-step project brief is being prepared. It will let you describe the project, optionally share budget and timing, and review everything before exporting it.',
    steps: [
      { index: '01', title: 'Project & goals', body: 'What you want to make and what it should achieve.' },
      { index: '02', title: 'Budget & timing', body: 'Optional. A rough range in USD or JPY, or “not sure”.' },
      { index: '03', title: 'Review & export', body: 'Add your name and email, check everything, then export the brief as JSON or text.' },
    ] satisfies BriefStep[],
    status: 'Brief builder in preparation — this preview does not send messages yet.',
  },

  footer: {
    line: 'Ideas into living products.',
    tags: ['Japan', 'Independent', 'A brighter digital tomorrow'],
    legal: 'Studio concepts shown on this site are self-initiated and use sample data.',
  },
} as const;

export type Site = typeof site;
