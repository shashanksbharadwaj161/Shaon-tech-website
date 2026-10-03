/**
 * The idea → product story is a pure function of scroll position.
 *
 * Native scroll drives a single number per section (hero exit and sequence
 * progress `q`). Every visual — WebGL material, camera, geometry and the HTML
 * narrative — is derived from those numbers here, so scrolling backwards plays
 * exactly the same states in reverse. Nothing latches on "has played".
 */
import { clamp01, damp, range01, smoothstep } from './math';

/**
 * Chapter boundaries in sequence progress. Copy is discrete: exactly one
 * chapter is active (and fully readable) at any progress; the swap itself is a
 * short time-based clipped transition, while the geometry stays continuous.
 */
export const CHAPTER_BOUNDS = [0, 0.25, 0.5, 0.74, 1] as const;
export const CHAPTER_COUNT = 4;

export interface StoryFrame {
  /** 0 at the top of the page → 1 once the hero has scrolled away. */
  hero: number;
  /** Sequence progress, 0 → 1. */
  q: number;
  /** The folded S opens (bend π → 0) and turns face-on. */
  unfold: number;
  /** Chrome dissolves into a controlled particle field. */
  release: number;
  /** Particles settle on the wireframe. */
  structure: number;
  /** Wireframe lines draw in (linear, for stroke drawing). */
  wire: number;
  /** The real interface fills the wireframe. */
  product: number;
  /** The one chapter whose copy is shown. */
  activeChapter: 0 | 1 | 2 | 3;
}

export function chapterIndexAt(q: number): 0 | 1 | 2 | 3 {
  if (q < CHAPTER_BOUNDS[1]) return 0;
  if (q < CHAPTER_BOUNDS[2]) return 1;
  if (q < CHAPTER_BOUNDS[3]) return 2;
  return 3;
}

/** Position of chapter `i` relative to the active one, for the clipped swap. */
export function chapterState(i: number, active: number): 'before' | 'active' | 'after' {
  return i < active ? 'before' : i > active ? 'after' : 'active';
}

export function storyFrame(heroProgress: number, sequenceProgress: number): StoryFrame {
  const hero = clamp01(heroProgress);
  const q = clamp01(sequenceProgress);
  return {
    hero,
    q,
    unfold: smoothstep(0.03, 0.27, q),
    release: smoothstep(0.23, 0.5, q),
    structure: smoothstep(0.46, 0.7, q),
    wire: range01(0.52, 0.8, q),
    product: smoothstep(0.73, 0.94, q),
    activeChapter: chapterIndexAt(q),
  };
}

/** Document-space measurements of the story wrapper, taken on layout/resize. */
export interface StoryMetrics {
  /** scrollY at which the hero starts leaving. */
  heroStart: number;
  /** Scroll distance over which the hero leaves. */
  heroLength: number;
  /** scrollY at which the pinned sequence begins. */
  sequenceStart: number;
  /** Scroll distance over which the pinned sequence plays. */
  sequenceLength: number;
}

export function progressFromScroll(scrollY: number, m: StoryMetrics): { hero: number; q: number } {
  return {
    hero: m.heroLength > 0 ? clamp01((scrollY - m.heroStart) / m.heroLength) : 1,
    q: m.sequenceLength > 0 ? clamp01((scrollY - m.sequenceStart) / m.sequenceLength) : 1,
  };
}

export interface ApproachOptions {
  /** Higher = snappier. */
  lambda: number;
  /** Jumps larger than this (e.g. anchor navigation) are applied instantly. */
  snap: number;
}

/**
 * Smooth the displayed progress towards the scroll-derived target. Because it
 * always converges on the target, the rendered state for a given scroll
 * position is the same whichever direction you arrived from.
 */
export function approach(current: number, target: number, dt: number, opts: ApproachOptions): number {
  const diff = Math.abs(target - current);
  if (diff > opts.snap || diff < 1e-4) return target;
  return damp(current, target, opts.lambda, Math.min(dt, 0.1));
}
