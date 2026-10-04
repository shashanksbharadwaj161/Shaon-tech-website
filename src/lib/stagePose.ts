import type { PreviewRect } from './liveState';
import { lerp } from './math';

/**
 * Where the mark sits on screen, in viewport fractions: `x`, `y` are the
 * centre (0..1, y down) and `h` is the mark height relative to viewport height.
 * Used by both the WebGL scene and the SVG fallback so they match exactly.
 */
export interface ScreenPose {
  x: number;
  y: number;
  h: number;
}

export function heroPose(width: number, height: number, layoutWidth = width, layoutHeight = height): ScreenPose {
  const aspect = width / height;
  // Narrow/tall screens reserve a complete art area above the copy. Wider
  // screens keep the mark in the right column, clear of the complete words.
  // CSS media queries use the layout viewport; the stage excludes scrollbars
  // and uses lvh, so those dimensions can differ at a responsive boundary.
  if (layoutWidth < 960 && layoutWidth / layoutHeight <= 1.15) return { x: 0.54, y: 0.27, h: 0.29 };
  // A tall desktop viewport must not grow the S wider than its copy-free column.
  if (aspect < 1.5) return { x: 0.76, y: 0.46, h: Math.min(0.48, aspect * 0.46) };
  if (layoutWidth >= 1100 && layoutWidth / layoutHeight >= 1.5) return { x: 0.82, y: 0.34, h: 0.48 };
  return { x: 0.75, y: 0.48, h: 0.58 };
}

export function storyPose(width: number, height: number, preview: PreviewRect | null): ScreenPose {
  if (!preview || preview.width === 0) {
    return width / height < 0.75 ? { x: 0.5, y: 0.32, h: 0.3 } : { x: 0.64, y: 0.5, h: 0.56 };
  }
  // Preview rects are CSS pixels from the top-left of the pinned stage, which
  // shares its origin with the canvas host.
  return {
    x: (preview.x + preview.width / 2) / width,
    y: (preview.y + preview.height / 2) / height,
    h: Math.min(0.6, (preview.height * 1.02) / height),
  };
}

export function mixPose(a: ScreenPose, b: ScreenPose, t: number): ScreenPose {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), h: lerp(a.h, b.h, t) };
}
