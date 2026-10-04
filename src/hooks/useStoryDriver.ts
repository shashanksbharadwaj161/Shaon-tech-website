import { useLayoutEffect, type RefObject } from 'react';
import { live, notifyLive, setPreviewRect } from '../lib/liveState';
import { approach, chapterState, progressFromScroll, storyFrame, type StoryFrame, type StoryMetrics } from '../lib/storyTimeline';

interface DriverRefs {
  root: RefObject<HTMLElement | null>;
  hero: RefObject<HTMLElement | null>;
  sequence: RefObject<HTMLElement | null>;
  pin: RefObject<HTMLElement | null>;
  preview: RefObject<HTMLElement | null>;
}

const VARS: [string, (f: StoryFrame) => number][] = [
  ['--hero', (f) => f.hero],
  ['--q', (f) => f.q],
  ['--unfold', (f) => f.unfold],
  ['--release', (f) => f.release],
  ['--structure', (f) => f.structure],
  ['--wire', (f) => f.wire],
  ['--product', (f) => f.product],
];

/**
 * Binds native scroll to the story timeline. Writes the frame into the shared
 * live state (read by WebGL) and into CSS custom properties on the story root
 * (read by the HTML narrative). No React state is touched per frame.
 */
export function useStoryDriver(refs: DriverRefs, enabled: boolean, smooth: boolean): void {
  useLayoutEffect(() => {
    const root = refs.root.current;
    if (!enabled || !root) {
      const frame = storyFrame(0, 0);
      live.frame = frame;
      // React keeps the story root when reduced motion swaps in the still
      // layout. Clear the previous scroll-driven CSS as well as the scene
      // channel, so the newly mounted hero is not faded or dissolved away.
      if (root) {
        for (const [name, get] of VARS) root.style.setProperty(name, get(frame).toFixed(4));
        root.dataset.chapter = String(frame.activeChapter);
        root.querySelectorAll<HTMLElement>('[data-chapter-i]').forEach((el) => {
          el.dataset.state = chapterState(Number(el.dataset.chapterI), frame.activeChapter);
        });
      }
      notifyLive();
      return;
    }
    let metrics: StoryMetrics = { heroStart: 0, heroLength: 1, sequenceStart: 1, sequenceLength: 1 };
    const current = { hero: 0, q: 0 };
    let target = { hero: 0, q: 0 };
    let raf = 0;
    let last = performance.now();
    let lastChapter = -1;

    const write = () => {
      const frame = storyFrame(current.hero, current.q);
      live.frame = frame;
      for (const [name, get] of VARS) root.style.setProperty(name, get(frame).toFixed(4));
      if (frame.activeChapter !== lastChapter) {
        lastChapter = frame.activeChapter;
        root.dataset.chapter = String(frame.activeChapter);
        root.querySelectorAll<HTMLElement>('[data-chapter-i]').forEach((el) => {
          el.dataset.state = chapterState(Number(el.dataset.chapterI), frame.activeChapter);
        });
      }
      notifyLive();
    };

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (smooth) {
        current.hero = approach(current.hero, target.hero, dt, { lambda: 8, snap: 0.6 });
        current.q = approach(current.q, target.q, dt, { lambda: 7, snap: 0.3 });
      } else {
        current.hero = target.hero;
        current.q = target.q;
      }
      write();
      raf = current.hero !== target.hero || current.q !== target.q ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      target = progressFromScroll(window.scrollY, metrics);
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const measure = () => {
      const hero = refs.hero.current;
      const sequence = refs.sequence.current;
      const pin = refs.pin.current;
      const preview = refs.preview.current;
      if (!hero || !sequence || !pin) return;
      const sy = window.scrollY;
      const heroRect = hero.getBoundingClientRect();
      const seqRect = sequence.getBoundingClientRect();
      metrics = {
        heroStart: heroRect.top + sy,
        heroLength: Math.max(1, hero.offsetHeight),
        sequenceStart: seqRect.top + sy,
        sequenceLength: Math.max(1, sequence.offsetHeight - pin.offsetHeight),
      };
      if (preview) {
        const p = preview.getBoundingClientRect();
        const pinRect = pin.getBoundingClientRect();
        setPreviewRect({
          x: p.left - pinRect.left,
          y: p.top - pinRect.top,
          width: p.width,
          height: p.height,
          viewportWidth: pin.clientWidth,
          viewportHeight: window.innerHeight,
        });
      }
      kick();
    };

    measure();
    // Start in the right place (e.g. reload mid-page, or arriving via #anchor).
    target = progressFromScroll(window.scrollY, metrics);
    current.hero = target.hero;
    current.q = target.q;
    write();

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', measure);
    };
  }, [enabled, smooth, refs.root, refs.hero, refs.sequence, refs.pin, refs.preview]);
}
