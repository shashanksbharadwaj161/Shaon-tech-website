import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_BRIEF } from './briefModel';
import {
  INITIAL_BRIEF_STATE,
  getBriefState,
  resetBriefState,
  recordBriefAcceptance,
  setBriefStep,
  subscribeBrief,
  updateBriefData,
} from './briefStore';

beforeEach(() => resetBriefState());

describe('briefStore', () => {
  it('keeps the accepted draft guard across routes and clears it on start over', () => {
    updateBriefData((data) => ({ ...data, name: 'Aiko' }));
    const answers = JSON.stringify(getBriefState().data);
    const unsubscribe = subscribeBrief(() => undefined);
    recordBriefAcceptance(answers);
    unsubscribe();
    setBriefStep(2);
    expect(getBriefState().acceptedAnswers).toBe(answers);
    updateBriefData((data) => ({ ...data, name: 'Another name' }));
    expect(JSON.stringify(getBriefState().data)).not.toBe(getBriefState().acceptedAnswers);
    resetBriefState();
    expect(getBriefState().acceptedAnswers).toBeNull();
  });
  it('keeps answers and step after every subscriber leaves (navigating away and back)', () => {
    const unsubscribe = subscribeBrief(() => undefined);
    updateBriefData((data) => ({ ...data, projectType: 'app', goals: 'A field notebook.' }));
    setBriefStep(2);
    unsubscribe();

    expect(getBriefState().step).toBe(2);
    expect(getBriefState().data).toMatchObject({ projectType: 'app', goals: 'A field notebook.' });
  });

  it('notifies only on real changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBrief(listener);

    setBriefStep(1); // already on step 1
    updateBriefData((data) => data); // no edit
    expect(listener).not.toHaveBeenCalled();

    updateBriefData((data) => ({ ...data, name: 'Aiko' }));
    setBriefStep(3);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('start over clears every answer and returns to step 1', () => {
    updateBriefData((data) => ({ ...data, name: 'Aiko', currency: 'JPY', budgetRange: 'not-sure' }));
    setBriefStep(3);
    resetBriefState();
    expect(getBriefState()).toBe(INITIAL_BRIEF_STATE);
    expect(getBriefState().data).toEqual(EMPTY_BRIEF);
  });

  it('never exposes a mutable empty brief', () => {
    expect(Object.isFrozen(EMPTY_BRIEF)).toBe(true);
    expect(Object.isFrozen(INITIAL_BRIEF_STATE)).toBe(true);
  });
});
