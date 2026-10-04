/**
 * All visitor-facing copy lives here so it can be edited without touching layout
 * or motion code. Keep it factual: no invented clients, testimonials, metrics,
 * team size, founders, history, awards, address or city. Contact details must be
 * supplied by the studio owner. Anything that
 * is not real client work is labelled as a studio concept.
 */

export type SectionId = 'work' | 'services' | 'lab' | 'process' | 'studio' | 'start';

export interface NavItem {
  id: SectionId;
  label: string;
  href: string;
}

export interface LinkAction {
  label: string;
  href: string;
}

export interface StoryChapter {
  id: 'idea' | 'signal' | 'structure' | 'product';
  index: string;
  kicker: string;
  title: string;
  body: string;
}

export interface Offering {
  id: 'websites' | 'apps';
  index: string;
  title: string;
  lead: string;
  body: string;
  points: string[];
}

export interface ApproachStep {
  title: string;
  body: string;
}

export interface ProcessStage {
  id: 'discover' | 'design' | 'develop' | 'launch';
  index: string;
  title: string;
  body: string;
  detail: string;
}

export interface BriefStep {
  index: string;
  title: string;
  body: string;
}

export const contact = {
  email: 'mediashaon@gmail.com',
  href: 'mailto:mediashaon@gmail.com',
  deliveryNote: 'Send your brief to mediashaon@gmail.com. You can also download a copy.',
} as const;

export const site = {
  name: 'ShaOn Tech',
  nameParts: { strong: 'ShaOn', light: 'Tech' },
  descriptor: 'Website and app design / development studio',
  contact,

  nav: [
    { id: 'work', label: 'Work', href: '/#work' },
    { id: 'services', label: 'Services', href: '/#services' },
    { id: 'lab', label: 'Lab', href: '/#lab' },
    { id: 'studio', label: 'Studio', href: '/#studio' },
  ] satisfies NavItem[],
  navCta: { label: 'Start a project', href: '/start-project' } satisfies LinkAction,

  hero: {
    labelTop: ['Website', 'and app', 'design /', 'development', 'studio'],
    headline: { lead: 'Ideas into', accent: 'living', tail: 'products', stop: '.' },
    body: 'ShaOn Tech designs and develops websites and apps. Based in Japan. Built for businesses everywhere.',
    primary: { label: 'Start a project', href: '/start-project' } satisfies LinkAction,
    secondary: { label: 'Explore the work', href: '/#work' } satisfies LinkAction,
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

  services: {
    eyebrow: 'Services',
    title: 'Built to be used.',
    intro: 'Two things, made well: websites and apps. Each is designed and developed in the same studio, so the idea survives all the way to the screen.',
    offerings: [
      {
        id: 'websites',
        index: '01',
        title: 'Websites',
        lead: 'Sites that explain, persuade and keep working.',
        body: 'Company, product and editorial websites with clear structure, considered motion and responsive layouts that hold up on every screen.',
        points: ['Information architecture', 'Editorial and visual design', 'Responsive front-end build', 'Accessible, fast pages'],
      },
      {
        id: 'apps',
        index: '02',
        title: 'Apps',
        lead: 'Interfaces people return to every day.',
        body: 'Web and mobile app interfaces — flows, components and the front-end behind them — from first prototype to a working product.',
        points: ['Product and interaction design', 'Prototypes you can use', 'Component-based front-end', 'Iteration after launch'],
      },
    ] satisfies Offering[],
    capabilities: ['UX/UI', 'Responsive engineering', 'Interaction', 'Iteration'],
    approachTitle: 'Our approach',
    approach: [
      { title: 'Design', body: 'Shape the idea into flows, structure and a visual direction.' },
      { title: 'Develop', body: 'Build it as a real, responsive website or app.' },
      { title: 'Launch', body: 'Take it live together, then keep refining.' },
    ] satisfies ApproachStep[],
    approachLink: { label: 'See the process', href: '/#process' } satisfies LinkAction,
  },

  work: {
    eyebrow: 'Work',
    title: 'Possibilities, made tangible.',
    intro:
      'Three studio concepts with working interfaces you can try. They are self-initiated explorations with sample data — not client work, real brands or real results.',
    listTitle: 'All studio concepts',
    open: 'Open concept',
  },

  lab: {
    eyebrow: 'Lab',
    title: 'Make your own signal.',
    body: 'This is the same folded S from the top of the page. Change its light, fold and signal, and the real-time scene follows.',
    groups: {
      light: 'Lighting',
      form: 'Distortion',
      signal: 'Particles',
    },
    pause: 'Pause lab',
    resume: 'Resume lab',
    reset: 'Reset to defaults',
    staticNote: 'Showing a still version: motion is reduced or 3D is unavailable. The controls still change the drawing.',
  },

  process: {
    eyebrow: 'Process',
    title: 'From first thought to final detail.',
    stages: [
      {
        id: 'discover',
        index: '01',
        title: 'Discover',
        body: 'One line of thought: what the product is for, who it serves and what success looks like.',
        detail: 'Goals · audience · constraints',
      },
      {
        id: 'design',
        index: '02',
        title: 'Design',
        body: 'The line opens into a grid — structure, flows and a visual system you can react to early.',
        detail: 'Structure · flows · visual system',
      },
      {
        id: 'develop',
        index: '03',
        title: 'Develop',
        body: 'The grid becomes a working interface, built in code and tested on real screens.',
        detail: 'Components · responsive build · testing',
      },
      {
        id: 'launch',
        index: '04',
        title: 'Launch',
        body: 'It settles into a finished frame: released, measured against its goals and refined.',
        detail: 'Release · review · refinement',
      },
    ] satisfies ProcessStage[],
  },

  studio: {
    eyebrow: 'Studio',
    title: 'Based in Japan. Built for everywhere.',
    paragraphs: [
      'ShaOn Tech is an independent studio that designs and develops websites and apps for startups and businesses.',
      'We care about a thoughtful process and useful interactions — interfaces that are clear to use, quick to load and open to everyone.',
    ],
    facts: [
      { label: 'Based in', value: 'Japan' },
      { label: 'Makes', value: 'Websites and apps' },
      { label: 'For', value: 'Startups and businesses' },
    ],
  },

  brief: {
    eyebrow: 'Start a project',
    title: 'What are you imagining?',
    body: 'Three short steps: the project, an optional budget and timing, then your details. Review your brief, send it online to ShaOn Tech, or download a copy to keep.',
    steps: [
      { index: '01', title: 'Project & goals', body: 'What you want to make and what it should achieve.' },
      { index: '02', title: 'Budget & timing', body: 'Optional. A rough range in USD or JPY, or “not sure”.' },
      { index: '03', title: 'Review & send', body: 'Your name and email, a final check, then send your brief or download a copy.' },
    ] satisfies BriefStep[],
    cta: { label: 'Start the brief', href: '/start-project' } satisfies LinkAction,
    deliveryNote: contact.deliveryNote,
  },

  footer: {
    line: 'Ideas into living products.',
    tags: ['Japan', 'Independent', 'A brighter digital tomorrow'],
    legal: 'Studio concepts on this site are self-initiated and use sample data.',
    privacy: { label: 'Privacy', href: '/privacy' } satisfies LinkAction,
  },
} as const;

export type Site = typeof site;
