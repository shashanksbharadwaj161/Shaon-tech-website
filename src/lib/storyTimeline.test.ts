import { describe, expect, it } from 'vitest';
import { approach, CHAPTER_BOUNDS, chapterState, progressFromScroll, storyFrame, type StoryFrame } from './storyTimeline';

const DRIVERS: (keyof StoryFrame)[] = ['unfold', 'release', 'structure', 'wire', 'product'];
const steps = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe('story timeline', () => {
  it('starts folded and ends as the product', () => {
    const start = storyFrame(0, 0);
    const end = storyFrame(1, 1);
    for (const k of DRIVERS) {
      expect(start[k]).toBe(0);
      expect(end[k]).toBe(1);
    }
    expect(start.activeChapter).toBe(0);
    expect(end.activeChapter).toBe(3);
  });

  it('clamps out-of-range scroll (overscroll, rubber-banding)', () => {
    expect(storyFrame(-0.4, -2)).toEqual(storyFrame(0, 0));
    expect(storyFrame(3, 1.7)).toEqual(storyFrame(1, 1));
  });

  it('every stage driver is monotonic, so scrolling back replays the same states in reverse', () => {
    let prev = storyFrame(1, 0);
    for (const q of steps(400).slice(1)) {
      const f = storyFrame(1, q);
      for (const k of DRIVERS) expect(f[k] as number).toBeGreaterThanOrEqual(prev[k] as number);
      prev = f;
    }
  });

  it('is continuous: a small scroll never causes a visual jump', () => {
    const qs = steps(2000);
    for (let i = 1; i < qs.length; i++) {
      const a = storyFrame(1, qs[i - 1]!);
      const b = storyFrame(1, qs[i]!);
      for (const k of DRIVERS) expect(Math.abs((b[k] as number) - (a[k] as number))).toBeLessThan(0.02);
    }
  });

  it('always has exactly one readable chapter — including right at the boundaries', () => {
    let prev = 0;
    for (const q of steps(4000)) {
      const { activeChapter } = storyFrame(1, q);
      expect([0, 1, 2, 3]).toContain(activeChapter);
      expect(activeChapter).toBeGreaterThanOrEqual(prev); // a step function of scroll
      expect(activeChapter - prev).toBeLessThanOrEqual(1); // never skips a chapter
      prev = activeChapter;
    }
    for (let i = 0; i < 4; i++) {
      const mid = (CHAPTER_BOUNDS[i]! + CHAPTER_BOUNDS[i + 1]!) / 2;
      expect(storyFrame(1, mid).activeChapter).toBe(i);
    }
    // Stopping exactly on a boundary, or a hair either side, still shows one chapter.
    for (const b of CHAPTER_BOUNDS.slice(1, -1)) {
      for (const q of [b - 1e-6, b, b + 1e-6]) {
        const states = [0, 1, 2, 3].map((i) => chapterState(i, storyFrame(1, q).activeChapter));
        expect(states.filter((st) => st === 'active')).toHaveLength(1);
      }
    }
  });

  it('places earlier chapters before and later chapters after the active one (wipe direction)', () => {
    expect([0, 1, 2, 3].map((i) => chapterState(i, 2))).toEqual(['before', 'before', 'active', 'after']);
  });

  it('maps document scroll to hero and sequence progress', () => {
    const m = { heroStart: 0, heroLength: 900, sequenceStart: 900, sequenceLength: 2700 };
    expect(progressFromScroll(0, m)).toEqual({ hero: 0, q: 0 });
    expect(progressFromScroll(450, m)).toEqual({ hero: 0.5, q: 0 });
    expect(progressFromScroll(900 + 1350, m)).toEqual({ hero: 1, q: 0.5 });
    expect(progressFromScroll(99999, m)).toEqual({ hero: 1, q: 1 });
  });
});

describe('smoothed progress', () => {
  const opts = { lambda: 7, snap: 0.3 };
  const settle = (from: number, to: number) => {
    let v = from;
    for (let i = 0; i < 600 && v !== to; i++) v = approach(v, to, 1 / 60, opts);
    return v;
  };

  it('converges exactly on the scroll position from either direction', () => {
    expect(settle(0.3, 0.42)).toBe(0.42);
    expect(settle(0.55, 0.42)).toBe(0.42);
    // Same scroll position → same rendered frame, regardless of direction of travel.
    expect(storyFrame(1, settle(0.3, 0.42))).toEqual(storyFrame(1, settle(0.55, 0.42)));
  });

  it('applies large jumps (anchor navigation) instantly instead of animating through the story', () => {
    expect(approach(0, 1, 1 / 60, opts)).toBe(1);
    expect(approach(1, 0.2, 1 / 60, opts)).toBe(0.2);
  });

  it('moves smoothly for small changes', () => {
    const v = approach(0.4, 0.5, 1 / 60, opts);
    expect(v).toBeGreaterThan(0.4);
    expect(v).toBeLessThan(0.5);
  });
});
