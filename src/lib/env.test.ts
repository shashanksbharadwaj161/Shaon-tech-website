import { describe, expect, it } from 'vitest';
import { chooseRenderer, parseQuerySwitches, qualityFor, resolveReducedMotion } from './env';

describe('QA query switches', () => {
  it.each([
    ['', 'auto'],
    ['?fallback=1', 'fallback'],
    ['?fallback=true', 'fallback'],
    ['?fallback=0', 'auto'],
    ['?webgl=0', 'fallback'],
    ['?renderer=fallback', 'fallback'],
    ['?renderer=svg', 'fallback'],
    ['?renderer=webgl', 'webgl'],
  ])('%s → renderer %s', (search, renderer) => {
    expect(parseQuerySwitches(search).renderer).toBe(renderer);
  });

  it.each([
    ['', 'system'],
    ['?motion=reduce', 'reduce'],
    ['?motion=reduced', 'reduce'],
    ['?reduced-motion=1', 'reduce'],
    ['?motion=full', 'full'],
  ])('%s → motion %s', (search, motion) => {
    expect(parseQuerySwitches(search).motion).toBe(motion);
  });

  it('combines switches', () => {
    expect(parseQuerySwitches('?fallback=1&motion=reduce&debug=1')).toEqual({ renderer: 'fallback', motion: 'reduce', debug: true });
  });
});

describe('fallback decision', () => {
  it('uses the SVG fallback when WebGL is missing or forced off', () => {
    expect(chooseRenderer('auto', 'none')).toBe('fallback');
    expect(chooseRenderer('fallback', 'webgl2')).toBe('fallback');
  });

  it('uses WebGL when available, or when explicitly requested for testing', () => {
    expect(chooseRenderer('auto', 'webgl')).toBe('webgl');
    expect(chooseRenderer('auto', 'webgl2')).toBe('webgl');
    expect(chooseRenderer('webgl', 'none')).toBe('webgl');
  });
});

describe('reduced motion', () => {
  it('honours the OS preference unless a QA override is set', () => {
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
    expect(resolveReducedMotion('reduce', false)).toBe(true);
    expect(resolveReducedMotion('full', true)).toBe(false);
  });
});

describe('quality tiers', () => {
  it('gives phones fewer particles and a lower DPR cap than desktops', () => {
    const phone = qualityFor({ coarsePointer: true, smallScreen: true, lowMemory: false, cores: 8 });
    const desktop = qualityFor({ coarsePointer: false, smallScreen: false, lowMemory: false, cores: 8 });
    expect(phone.particles).toBeLessThan(desktop.particles);
    expect(phone.maxDpr).toBeLessThan(desktop.maxDpr);
  });
});
