import { describe, expect, it } from 'vitest';
import { CASE_SLUGS, classifyLink, matchRoute, normalisePath, PATHS, routeTitle } from './routes';

describe('route matching', () => {
  it('matches every page, tolerating trailing slashes and case', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' });
    expect(matchRoute('/index.html')).toEqual({ name: 'home' });
    expect(matchRoute('/start-project/')).toEqual({ name: 'start' });
    expect(matchRoute('/Privacy')).toEqual({ name: 'privacy' });
    for (const slug of CASE_SLUGS) expect(matchRoute(PATHS.case(slug))).toEqual({ name: 'case', slug });
  });

  it('sends unknown paths (including unknown case slugs) to the not-found page', () => {
    expect(matchRoute('/work/real-client')).toEqual({ name: 'notFound', path: '/work/real-client' });
    expect(matchRoute('/work')).toMatchObject({ name: 'notFound' });
    expect(matchRoute('/start-project/extra')).toMatchObject({ name: 'notFound' });
  });

  it('normalises repeated and trailing slashes', () => {
    expect(normalisePath('//work//product-workspace/')).toBe('/work/product-workspace');
    expect(normalisePath('')).toBe('/');
  });

  it('gives each page its own document title', () => {
    const titles = [
      routeTitle({ name: 'home' }),
      routeTitle({ name: 'case', slug: 'product-workspace' }, () => 'Product workspace'),
      routeTitle({ name: 'start' }),
      routeTitle({ name: 'privacy' }),
      routeTitle({ name: 'notFound', path: '/x' }),
    ];
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles[1]).toBe('Product workspace — Studio concept — ShaOn Tech');
  });
});

describe('link classification', () => {
  const home = { origin: 'https://example.test', pathname: '/' };
  const privacy = { origin: 'https://example.test', pathname: '/privacy' };

  it('treats same-page anchors as in-page jumps', () => {
    expect(classifyLink('#work', home)).toEqual({ kind: 'hash', hash: '#work' });
    expect(classifyLink('/#work', home)).toEqual({ kind: 'hash', hash: '#work' });
  });

  it('routes to another page, keeping the anchor for after the page renders', () => {
    expect(classifyLink('/#work', privacy)).toEqual({ kind: 'route', pathname: '/', hash: '#work' });
    expect(classifyLink('/work/hospitality-stay', home)).toEqual({ kind: 'route', pathname: '/work/hospitality-stay', hash: '' });
  });

  it('leaves other origins and file downloads to the browser', () => {
    expect(classifyLink('https://elsewhere.test/', home)).toEqual({ kind: 'external' });
    expect(classifyLink('/brief.json', home)).toEqual({ kind: 'external' });
  });
});
