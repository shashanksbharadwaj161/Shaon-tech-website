import { useEffect, useState } from 'react';
import type { SectionId } from '../content/site';

/**
 * One observer for the whole page:
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
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    const liveIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).dataset.inview = e.isIntersecting ? 'true' : 'false';
      },
      { threshold: 0 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));
    document.querySelectorAll('[data-live]').forEach((el) => liveIo.observe(el));
    return () => {
      reveal.disconnect();
      liveIo.disconnect();
    };
  }, []);
}

/** The section currently crossing the middle of the viewport, for nav highlighting. */
export function useActiveSection(ids: readonly SectionId[]): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const current = ids.find((id) => visible.get(id)) ?? null;
        setActive(current);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}
