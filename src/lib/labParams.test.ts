import { describe, expect, it } from 'vitest';
import { clampParam, isDefault, LAB_CONTROLS, LAB_DEFAULTS, labUniforms, withParam, type LabParams } from './labParams';

describe('lab parameters', () => {
  it('has a control for every parameter, and every default sits inside its range', () => {
    const keys = Object.keys(LAB_DEFAULTS) as (keyof LabParams)[];
    expect(LAB_CONTROLS.map((c) => c.key).sort()).toEqual([...keys].sort());
    for (const c of LAB_CONTROLS) {
      expect(LAB_DEFAULTS[c.key]).toBeGreaterThanOrEqual(c.min);
      expect(LAB_DEFAULTS[c.key]).toBeLessThanOrEqual(c.max);
      expect(clampParam(c.key, LAB_DEFAULTS[c.key])).toBe(LAB_DEFAULTS[c.key]);
    }
  });

  it('clamps out-of-range and non-numeric input and snaps to the step', () => {
    expect(clampParam('fold', 140)).toBe(100);
    expect(clampParam('twist', -99)).toBe(-40);
    expect(clampParam('exposure', 0.4 + 0.05 * 3 + 0.0000001)).toBe(0.55);
    expect(clampParam('signal', Number.NaN)).toBe(LAB_DEFAULTS.signal);
  });

  it('reset is a return to the documented defaults', () => {
    const changed = withParam(withParam({ ...LAB_DEFAULTS }, 'fold', 20), 'rim', 1.2);
    expect(isDefault(changed)).toBe(false);
    expect(isDefault({ ...LAB_DEFAULTS })).toBe(true);
    expect(Object.isFrozen(LAB_DEFAULTS)).toBe(true);
  });

  it('maps fold 100% to the folded mark and 0% to a flat ribbon', () => {
    expect(labUniforms({ ...LAB_DEFAULTS, fold: 100 }).bend).toBeCloseTo(Math.PI, 9);
    expect(labUniforms({ ...LAB_DEFAULTS, fold: 0 }).bend).toBe(0);
    expect(labUniforms({ ...LAB_DEFAULTS, signal: 0 }).release).toBe(0);
    expect(labUniforms({ ...LAB_DEFAULTS, twist: 0 }).twist).toBe(0);
  });
});
