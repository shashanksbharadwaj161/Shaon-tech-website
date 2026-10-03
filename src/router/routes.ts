/**
 * Route table. Pure functions only, so matching and titles are unit-testable.
 */

export const CASE_SLUGS = ['product-workspace', 'objects-commerce', 'hospitality-stay'] as const;
export type CaseSlug = (typeof CASE_SLUGS)[number];

export type Route =
  | { name: 'home' }
  | { name: 'case'; slug: CaseSlug }
  | { name: 'start' }
  | { name: 'privacy' }
  | { name: 'notFound'; path: string };

export const PATHS = {
  home: '/',
  start: '/start-project',
  privacy: '/privacy',
  case: (slug: CaseSlug) => `/work/${slug}`,
} as const;

const isCaseSlug = (s: string): s is CaseSlug => (CASE_SLUGS as readonly string[]).includes(s);

/** Normalise a pathname: collapse repeated slashes, drop a trailing slash (except root), lowercase. */
export function normalisePath(pathname: string): string {
  let p = (pathname || '/').replace(/\/{2,}/g, '/').toLowerCase();
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '/index.html') p = '/';
  return p || '/';
}

export function matchRoute(pathname: string): Route {
  const p = normalisePath(pathname);
  if (p === '/') return { name: 'home' };
  if (p === PATHS.start) return { name: 'start' };
  if (p === PATHS.privacy) return { name: 'privacy' };
  const m = /^\/work\/([a-z0-9-]+)$/.exec(p);
  if (m && isCaseSlug(m[1]!)) return { name: 'case', slug: m[1] };
  return { name: 'notFound', path: pathname };
}

/** Stable identity for a route (used to re-run effects on navigation). */
export function routeKey(route: Route): string {
  return route.name === 'case' ? `case:${route.slug}` : route.name === 'notFound' ? `404:${route.path}` : route.name;
}

const SITE = 'ShaOn Tech';

export function routeTitle(route: Route, caseTitle?: (slug: CaseSlug) => string): string {
  switch (route.name) {
    case 'home':
      return `${SITE} — Ideas into living products`;
    case 'case':
      return `${caseTitle ? caseTitle(route.slug) : route.slug} — Studio concept — ${SITE}`;
    case 'start':
      return `Start a project — ${SITE}`;
    case 'privacy':
      return `Privacy — ${SITE}`;
    case 'notFound':
      return `Page not found — ${SITE}`;
  }
}

/**
 * Decide how a click on an <a href> should be handled.
 *  - 'external': leave it to the browser (other origin, new tab, download…)
 *  - 'hash': same page, in-page anchor
 *  - 'route': client-side navigation to another route
 */
export function classifyLink(
  href: string,
  current: { origin: string; pathname: string },
): { kind: 'external' } | { kind: 'hash'; hash: string } | { kind: 'route'; pathname: string; hash: string } {
  let url: URL;
  try {
    url = new URL(href, `${current.origin}${current.pathname}`);
  } catch {
    return { kind: 'external' };
  }
  if (url.origin !== current.origin) return { kind: 'external' };
  if (/\.(pdf|zip|json|txt|png|jpe?g|webp|avif|svg)$/i.test(url.pathname)) return { kind: 'external' };
  const samePath = normalisePath(url.pathname) === normalisePath(current.pathname);
  if (samePath && url.hash) return { kind: 'hash', hash: url.hash };
  return { kind: 'route', pathname: url.pathname, hash: url.hash };
}
