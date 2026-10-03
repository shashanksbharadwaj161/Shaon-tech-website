import { smoothstep } from './math';

export interface ProcessDrivers {
  discover: number;
  design: number;
  develop: number;
  launch: number;
}

/**
 * Pure: progress through the pinned Process chapter → four stage drivers and
 * the active stage. Monotonic in `p`, so scrolling back replays it in reverse.
 */
export function processDrivers(p: number): ProcessDrivers & { stage: 0 | 1 | 2 | 3 } {
  return {
    discover: smoothstep(0.02, 0.2, p),
    design: smoothstep(0.24, 0.46, p),
    develop: smoothstep(0.5, 0.72, p),
    launch: smoothstep(0.76, 0.94, p),
    stage: p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3,
  };
}
