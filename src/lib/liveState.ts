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
  pointer: { x: number; y: number; active: boolean };
  preview: PreviewRect | null;
  /** Increments whenever the preview rect changes so the scene can rebuild targets. */
  previewVersion: number;
}

export const live: LiveState = {
  frame: storyFrame(0, 0),
  pointer: { x: 0, y: 0, active: false },
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

let pointerInstalled = false;
/** Install a single passive window pointer listener (idempotent). */
export function installPointerTracking(): () => void {
  if (pointerInstalled || typeof window === 'undefined') return () => {};
  pointerInstalled = true;
  const onMove = (e: PointerEvent) => {
    live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    live.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    live.pointer.active = true;
    notifyLive();
  };
  const onLeave = () => {
    live.pointer.active = false;
    notifyLive();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    pointerInstalled = false;
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}
