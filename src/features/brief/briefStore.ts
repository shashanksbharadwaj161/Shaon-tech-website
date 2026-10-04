/**
 * Project brief — in-memory store.
 *
 * A module-level value, so answers survive leaving the page and coming back
 * within the same visit, while a full reload starts empty. No storage APIs
 * and no network: closing or reloading the tab discards everything.
 */
import { useSyncExternalStore } from 'react';
import { EMPTY_BRIEF, type BriefData, type Step } from './briefModel';

export interface BriefState {
  readonly step: Step;
  readonly data: BriefData;
  /** In-memory duplicate guard, kept across routes with the draft. */
  readonly acceptedAnswers: string | null;
}

export const INITIAL_BRIEF_STATE: BriefState = Object.freeze({ step: 1, data: EMPTY_BRIEF, acceptedAnswers: null });

type Listener = () => void;

let state: BriefState = INITIAL_BRIEF_STATE;
const listeners = new Set<Listener>();

export function getBriefState(): BriefState {
  return state;
}

/** Replaces the state (or derives it from the previous one). Listeners run only when it actually changes. */
export function setBriefState(next: BriefState | ((previous: BriefState) => BriefState)): void {
  const resolved = typeof next === 'function' ? next(state) : next;
  if (Object.is(resolved, state)) return;
  state = resolved;
  for (const listener of [...listeners]) listener();
}

export function updateBriefData(update: (data: BriefData) => BriefData): void {
  setBriefState((previous) => {
    const data = update(previous.data);
    return data === previous.data ? previous : { ...previous, data };
  });
}

export function setBriefStep(step: Step): void {
  setBriefState((previous) => (previous.step === step ? previous : { ...previous, step }));
}

export function recordBriefAcceptance(answers: string): void {
  setBriefState((previous) => previous.acceptedAnswers === answers ? previous : { ...previous, acceptedAnswers: answers });
}

/** Clears every answer and returns to step 1. */
export function resetBriefState(): void {
  setBriefState(INITIAL_BRIEF_STATE);
}

export function subscribeBrief(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBriefState(): BriefState {
  return useSyncExternalStore(subscribeBrief, getBriefState, getBriefState);
}
