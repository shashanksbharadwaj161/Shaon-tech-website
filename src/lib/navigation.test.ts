import { describe, expect, it } from 'vitest';
import { planJump } from './navigation';

const story = { start: 900, end: 900 + 3600 };
const vh = 900;

describe('anchor navigation', () => {
  it('jumps instantly past the pinned sequence instead of scrubbing through it', () => {
    expect(planJump(0, 6000, vh, false, story).behavior).toBe('auto');
    expect(planJump(6000, 0, vh, false, story).behavior).toBe('auto');
  });

  it('eases short hops that stay clear of the sequence', () => {
    expect(planJump(6000, 6800, vh, false, story).behavior).toBe('smooth');
  });

  it('jumps instantly for long distances and for reduced motion', () => {
    expect(planJump(6000, 9000, vh, false, story).behavior).toBe('auto');
    expect(planJump(6000, 6400, vh, true, story).behavior).toBe('auto');
  });
});
