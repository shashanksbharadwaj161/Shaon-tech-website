import { useEffect, useState } from 'react';
import type { SectionId } from '../content/site';

/**
 * One observer pair for the whole app, which also picks up content that
 * mounts later (lazy routes, demos):
 *  - `[data-reveal]` elements get `data-revealed="true"` once they enter view;
 *  - `[data-live]` elements get `data-inview` toggled so looping animations only
 *    run while visible.
 */
export function useRevealObservers(): void {
  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.revealed = 'true';
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.06 },
    );
    const liveIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).dataset.inview = e.isIntersecting ? 'true' : 'false';
      },
      { threshold: 0 },
    );
    const seen = new WeakSet<Element>();
    const scan = (root: ParentNode) => {
      root.querySelectorAll('[data-reveal]').forEach((el) => {
        if (!seen.has(el) && (el as HTMLElement).dataset.revealed !== 'true') {
          seen.add(el);
          reveal.observe(el);
        }
      });
      root.querySelectorAll('[data-live]').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          liveIo.observe(el);
        }
      });
    };
    scan(document);
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan(document);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      reveal.disconnect();
      liveIo.disconnect();
    };
  }, []);
}

/** The section currently crossing the middle of the viewport, for nav highlighting. */
export function useActiveSection(ids: readonly SectionId[], routeKey: string): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    setActive(null);
    if (ids.length === 0) return;
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        setActive(ids.find((id) => visible.get(id)) ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    // Sections may mount a frame later.
    const raf = requestAnimationFrame(() =>
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) io.observe(el);
      }),
    );
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [ids, routeKey]);
  return active;
}
