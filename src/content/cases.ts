/**
 * Studio concept case studies. These are self-initiated explorations with
 * sample data — never client engagements, real brands, products, properties
 * or results. Titles are descriptive on purpose: no invented brand names.
 */
import type { CaseSlug } from '../router/routes';
import type { MediaKey } from './media';

export interface CaseDecision {
  title: string;
  body: string;
}

export interface CaseStudy {
  slug: CaseSlug;
  index: string;
  title: string;
  kind: string;
  /** One line for the Work panels and lists. */
  summary: string;
  problem: string;
  audience: string;
  decisions: CaseDecision[];
  interactions: string[];
  limitations: string[];
  /** Short label shown above the working demo. */
  demoLabel: string;
  media?: MediaKey;
}

export const CASES: CaseStudy[] = [
  {
    slug: 'product-workspace',
    index: 'C—01',
    title: 'Product workspace',
    kind: 'SaaS dashboard',
    summary: 'Filtering a busy task workspace so results stay legible, counted and easy to undo.',
    problem:
      'An imagined product team tracks work across several projects. As the list grows, people lose track of what is filtered, how much is hidden and how to get back to everything.',
    audience: 'Small product teams who check the same task list many times a day, on desktop and on the go.',
    decisions: [
      {
        title: 'Counts before clicks',
        body: 'Every status filter shows how many tasks it would return with the other filters applied, so people can see the effect of a choice before making it.',
      },
      {
        title: 'Filters you can read back',
        body: 'Active filters are summarised in a plain sentence and the result count is announced, so the current view is never a mystery.',
      },
      {
        title: 'An empty state that helps',
        body: 'When nothing matches, the view says why and offers a single reset instead of a blank table.',
      },
    ],
    interactions: [
      'Search by task title',
      'Toggle status filters with live counts',
      'Narrow by category',
      'Clear everything with one reset',
    ],
    limitations: [
      'All projects and tasks are sample data generated for this concept.',
      'Nothing is saved: reloading the page restores the sample list.',
      'There are no accounts, sharing or real-time updates.',
    ],
    demoLabel: 'Working demo — sample data',
  },
  {
    slug: 'objects-commerce',
    index: 'C—02',
    title: 'Objects commerce',
    kind: 'Commerce',
    summary: 'Choosing a variant of a single object and editing a cart whose totals are never ambiguous.',
    problem:
      'Small object shops often hide how options change the price, and carts make quantities and totals hard to correct. This concept explores one product page and a cart that always shows exactly what will be counted.',
    audience: 'Visitors comparing a few variants of one considered object, often on a phone.',
    decisions: [
      {
        title: 'Price follows the choice',
        body: 'The unit price updates the moment a variant changes, and the selected options are repeated in plain words next to the add button.',
      },
      {
        title: 'One line per variant',
        body: 'Adding the same variant again increases its quantity instead of creating a duplicate line, so totals stay easy to check.',
      },
      {
        title: 'Honest about the demo',
        body: 'Prices are labelled as sample prices and there is no checkout — the cart ends where a real payment step would begin.',
      },
    ],
    interactions: [
      'Select finish and size',
      'Add to cart, change quantity, remove a line',
      'Line totals and subtotal recalculate instantly',
      'Empty-cart state with a way back',
    ],
    limitations: [
      'The capsule lamp is a fictional object rendered for this concept.',
      'Prices are sample prices for the demo only; nothing can be bought.',
      'No checkout, payment, tax, shipping or delivery is implemented or implied.',
    ],
    demoLabel: 'Working demo — sample prices, no checkout',
    media: 'lamp',
  },
  {
    slug: 'hospitality-stay',
    index: 'C—03',
    title: 'Hospitality stay',
    kind: 'Hospitality',
    summary: 'Exploring dates and guests against sample availability, with clear answers when nothing fits.',
    problem:
      'Availability search often fails silently: reversed dates, past dates or too many guests return an empty page with no explanation. This concept explores a small pavilion stay where every outcome is explained.',
    audience: 'Guests comparing a few dates and party sizes before deciding where to stay.',
    decisions: [
      {
        title: 'Validate in plain language',
        body: 'Missing, reversed or past dates are caught next to the field that needs fixing, and focus moves there.',
      },
      {
        title: 'Show the whole picture',
        body: 'Results list every sample pavilion, marking which fit the dates and party size and why the others do not.',
      },
      {
        title: 'No false confirmation',
        body: 'The demo stops at availability. It never shows a booking reference or a confirmation.',
      },
    ],
    interactions: [
      'Choose check-in and check-out dates',
      'Set the number of guests',
      'See available and unavailable sample pavilions',
      'Helpful messages for blank, reversed and past dates',
    ],
    limitations: [
      'The pavilions and their availability are sample inventory, not a real property.',
      'There is no location, booking, payment or confirmation.',
      'Availability is generated from the dates you enter, not from a live system.',
    ],
    demoLabel: 'Working demo — sample inventory, no booking',
    media: 'pavilion',
  },
];

export const caseBySlug = (slug: CaseSlug): CaseStudy => CASES.find((c) => c.slug === slug)!;
