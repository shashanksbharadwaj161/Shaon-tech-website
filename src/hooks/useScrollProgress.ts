import { useEffect, useRef, type RefObject } from 'react';
import { clamp01 } from '../lib/math';
import { approach, type ApproachOptions } from '../lib/storyTimeline';

export type ProgressMode =
  /** 0 when the element's top enters at `start` × viewport height, 1 when it reaches `end` × viewport height. */
  | { kind: 'enter'; start?: number; end?: number }
  /** 0 → 1 while a tall (pinned) section scrolls past: top at viewport top → bottom at viewport bottom. */
  | { kind: 'pinned' };

interface ProgressOptions {
  /** Smooth rendered progress only; native scrolling remains unchanged. */
  smoothing?: ApproachOptions;
  /** Pinned scenes may use a stable CSS height smaller than the live viewport. */
  pin?: RefObject<HTMLElement | null>;
}

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
 * finished state is always visible. Optional smoothing settles to the exact
 * native scroll position, snapping initial positions and large jumps. Never
 * sets React state.
 */
export function useScrollProgress<T extends Element>(
  ref: RefObject<T | null>,
  onProgress: (p: number) => void,
  mode: ProgressMode,
  still: boolean,
  options?: ProgressOptions,
): void {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const modeKey = JSON.stringify(mode);
  const smoothingKey = options?.smoothing ? JSON.stringify(options.smoothing) : '';
  const pin = options?.pin;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) {
      cb.current(1);
      return;
    }
    const m = JSON.parse(modeKey) as ProgressMode;
    const smoothing = smoothingKey ? (JSON.parse(smoothingKey) as ApproachOptions) : null;
    let raf = 0;
    let last = -1;
    let rendered = 0;
    let initialized = false;
    let lastTime = performance.now();
    const update = (now: number) => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const pinHeight = m.kind === 'pinned' ? pin?.current?.getBoundingClientRect().height : undefined;
      const extent = pinHeight !== undefined && pinHeight > 0 ? pinHeight : window.innerHeight;
      const target = progressFor({ top: r.top, height: r.height }, extent, m);
      rendered = smoothing && initialized ? approach(rendered, target, (now - lastTime) / 1000, smoothing) : target;
      initialized = true;
      lastTime = now;
      if (Math.abs(rendered - last) > 1e-4 || (rendered === target && rendered !== last)) {
        last = rendered;
        cb.current(rendered);
      }
      if (smoothing && rendered !== target) raf = requestAnimationFrame(update);
    };
    const schedule = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(update);
      }
    };
    // Reload, restored scroll and preference changes start at the current
    // physical position rather than playing through earlier chapters.
    update(performance.now());
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, modeKey, still, smoothingKey, pin]);
}
