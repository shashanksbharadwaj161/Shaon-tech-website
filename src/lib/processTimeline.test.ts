import { describe, expect, it } from 'vitest';
import { processDrivers } from './processTimeline';

const KEYS = ['discover', 'design', 'develop', 'launch'] as const;

describe('process timeline', () => {
  it('starts as a blank page and ends as a finished frame', () => {
    const a = processDrivers(0);
    const b = processDrivers(1);
    for (const k of KEYS) {
      expect(a[k]).toBe(0);
      expect(b[k]).toBe(1);
    }
    expect([a.stage, b.stage]).toEqual([0, 3]);
  });

  it('is monotonic and ordered: each stage completes before the next begins to dominate', () => {
    let prev = processDrivers(0);
    for (let i = 1; i <= 1000; i++) {
      const d = processDrivers(i / 1000);
      for (const k of KEYS) expect(d[k]).toBeGreaterThanOrEqual(prev[k]);
      expect(d.stage).toBeGreaterThanOrEqual(prev.stage);
      prev = d;
    }
    // While a later stage is moving, the earlier one is already complete.
    const mid = processDrivers(0.6);
    expect(mid.design).toBe(1);
    expect(mid.develop).toBeGreaterThan(0);
    expect(mid.develop).toBeLessThan(1);
  });
});
