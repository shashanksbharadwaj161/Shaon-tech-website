/**
 * Mutable, non-React state shared between the scroll driver, the pointer
 * listener and the WebGL scene. Reading these inside `useFrame` (or a rAF)
 * avoids per-frame React renders entirely.
 */
import { storyFrame, type StoryFrame } from './storyTimeline';

export interface PreviewRect {
  /** Interface preview rect relative to the pinned viewport, in CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Viewport size the rect was measured against. */
  viewportWidth: number;
  viewportHeight: number;
}

interface LiveState {
  frame: StoryFrame;
  /**
   * Normalised pointer / touch position (-1..1, y up). `pressAt` is the time of
   * the last press or tap (performance.now), used for a decaying "energy" pulse.
   */
  pointer: { x: number; y: number; active: boolean; kind: 'mouse' | 'touch' | 'pen'; pressAt: number };
  /** Native scroll velocity in px/s, and when it was measured (decays in the scene). */
  scroll: { velocity: number; at: number };
  preview: PreviewRect | null;
  /** Increments whenever the preview rect changes so the scene can rebuild targets. */
  previewVersion: number;
}

export const live: LiveState = {
  frame: storyFrame(0, 0),
  pointer: { x: 0, y: 0, active: false, kind: 'mouse', pressAt: -1e9 },
  scroll: { velocity: 0, at: 0 },
  preview: null,
  previewVersion: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to "something visible changed" (scroll, pointer, layout). */
export function subscribeLive(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyLive(): void {
  listeners.forEach((fn) => fn());
}

export function setPreviewRect(rect: PreviewRect | null): void {
  live.preview = rect;
  live.previewVersion++;
  notifyLive();
}

/** Energy (1 → 0) of the most recent press/tap, decaying over ~0.6 s. */
export function pressEnergy(now = performance.now()): number {
  const dt = now - live.pointer.pressAt;
  return dt < 0 ? 0 : Math.exp(-dt / 380);
}

/** Scroll velocity decayed by the time since the last scroll event. */
export function scrollVelocity(now = performance.now()): number {
  return live.scroll.velocity * Math.exp(-(now - live.scroll.at) / 180);
}

let pointerInstalled = false;
/**
 * Install passive window listeners for mouse, pen and touch (idempotent).
 * Touch listeners are passive and never call preventDefault, so native
 * vertical scrolling is untouched; they only read where the finger is.
 */
export function installPointerTracking(): () => void {
  if (pointerInstalled || typeof window === 'undefined') return () => {};
  pointerInstalled = true;
  const setFrom = (clientX: number, clientY: number) => {
    live.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    live.pointer.y = -((clientY / window.innerHeight) * 2 - 1);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events, which keep firing while scrolling
    setFrom(e.clientX, e.clientY);
    live.pointer.active = true;
    live.pointer.kind = e.pointerType === 'pen' ? 'pen' : 'mouse';
    notifyLive();
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    live.pointer.pressAt = performance.now();
    notifyLive();
  };
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    setFrom(t.clientX, t.clientY);
    live.pointer.active = true;
    live.pointer.kind = 'touch';
    if (e.type === 'touchstart') live.pointer.pressAt = performance.now();
    notifyLive();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      live.pointer.active = false;
      notifyLive();
    }
  };
  const onLeave = () => {
    live.pointer.active = false;
    notifyLive();
  };
  let lastY = window.scrollY;
  let lastT = performance.now();
  const onScroll = () => {
    const now = performance.now();
    const dt = Math.max(8, now - lastT);
    const v = ((window.scrollY - lastY) / dt) * 1000;
    live.scroll.velocity = live.scroll.velocity * 0.6 + v * 0.4;
    live.scroll.at = now;
    lastY = window.scrollY;
    lastT = now;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    pointerInstalled = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('touchstart', onTouch);
    window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('scroll', onScroll);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}
