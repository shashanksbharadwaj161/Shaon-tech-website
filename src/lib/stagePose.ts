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

export function heroPose(width: number, height: number): ScreenPose {
  const aspect = width / height;
  if (aspect < 0.75) return { x: 0.6, y: 0.29, h: 0.32 };
  if (aspect < 1.15) return { x: 0.63, y: 0.36, h: 0.44 };
  if (aspect < 1.5) return { x: 0.71, y: 0.48, h: 0.55 };
  return { x: 0.725, y: 0.51, h: 0.62 };
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
