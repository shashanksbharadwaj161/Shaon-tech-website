import { useEffect, useRef, type RefObject } from 'react';
import { clamp01 } from '../lib/math';

export type ProgressMode =
  /** 0 when the element's top enters at `start` × viewport height, 1 when it reaches `end` × viewport height. */
  | { kind: 'enter'; start?: number; end?: number }
  /** 0 → 1 while a tall (pinned) section scrolls past: top at viewport top → bottom at viewport bottom. */
  | { kind: 'pinned' };

/** Pure: progress for a given element rect and viewport height. */
export function progressFor(rect: { top: number; height: number }, viewportHeight: number, mode: ProgressMode): number {
  if (mode.kind === 'pinned') {
    const travel = rect.height - viewportHeight;
    return travel > 0 ? clamp01(-rect.top / travel) : rect.top <= 0 ? 1 : 0;
  }
  const start = (mode.start ?? 0.95) * viewportHeight;
  const end = (mode.end ?? 0.3) * viewportHeight;
  return clamp01((start - rect.top) / (start - end));
}

/**
 * Calls `onProgress` (rAF-throttled, passive scroll) with the element's scroll
 * progress. With `still` (reduced motion) it reports 1 once and stops, so the
 * finished state is always visible. Never sets React state.
 */
export function useScrollProgress<T extends Element>(
  ref: RefObject<T | null>,
  onProgress: (p: number) => void,
  mode: ProgressMode,
  still: boolean,
): void {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const modeKey = JSON.stringify(mode);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) {
      cb.current(1);
      return;
    }
    const m = JSON.parse(modeKey) as ProgressMode;
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = progressFor({ top: r.top, height: r.height }, window.innerHeight, m);
      if (Math.abs(p - last) > 1e-4) {
        last = p;
        cb.current(p);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, modeKey, still]);
}
