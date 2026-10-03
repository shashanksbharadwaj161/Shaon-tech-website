/**
 * In-page navigation that never drags the visitor through the cinematic
 * sequence. Jumps that would cross the pinned story (or are long) are instant;
 * short hops ease. Focus moves to the destination so keyboard and screen-reader
 * users land where sighted users do.
 */

export interface JumpPlan {
  behavior: ScrollBehavior;
}

/**
 * Decide how to scroll from `from` to `to` (document scroll offsets).
 * `cinematic` is the document range of the pinned sequence, if any.
 */
export function planJump(
  from: number,
  to: number,
  viewportHeight: number,
  reduced: boolean,
  cinematic: { start: number; end: number } | null,
): JumpPlan {
  if (reduced) return { behavior: 'auto' };
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const crossesStory = cinematic !== null && lo < cinematic.end && hi > cinematic.start;
  const long = hi - lo > viewportHeight * 1.6;
  return { behavior: crossesStory || long ? 'auto' : 'smooth' };
}

export function navigateToHash(hash: string, reduced: boolean): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const target = id === 'top' || id === '' ? document.body : document.getElementById(id);
  if (!target) return false;

  const story = document.querySelector<HTMLElement>('[data-cinematic-range]');
  let cinematic: { start: number; end: number } | null = null;
  if (story) {
    const r = story.getBoundingClientRect();
    cinematic = { start: r.top + window.scrollY, end: r.bottom + window.scrollY };
  }
  const destination = id === 'top' || id === '' ? 0 : target.getBoundingClientRect().top + window.scrollY;
  const plan = planJump(window.scrollY, destination, window.innerHeight, reduced, cinematic);

  if (id === 'top' || id === '') window.scrollTo({ top: 0, behavior: plan.behavior });
  else target.scrollIntoView({ behavior: plan.behavior, block: 'start' });

  const focusable = id === 'top' || id === '' ? document.getElementById('main') : target;
  if (focusable) {
    if (!focusable.hasAttribute('tabindex')) focusable.setAttribute('tabindex', '-1');
    focusable.focus({ preventScroll: true });
  }
  if (window.location.hash !== `#${id}`) history.pushState(null, '', id ? `#${id}` : '#');
  return true;
}

/** Delegate clicks on same-page hash links. Returns a cleanup function. */
export function installHashNavigation(isReduced: () => boolean, beforeNavigate?: () => void): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
    if (!(link instanceof HTMLAnchorElement)) return;
    const hash = link.getAttribute('href') ?? '';
    if (hash.length < 1) return;
    beforeNavigate?.();
    if (navigateToHash(hash, isReduced())) event.preventDefault();
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
