import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';
import { navigateToHash } from '../lib/navigation';
import { classifyLink, matchRoute, routeKey, type Route } from './routes';

interface Location {
  pathname: string;
  hash: string;
}

interface RouterValue {
  route: Route;
  location: Location;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

interface HistoryState {
  scrollY?: number;
}

const readLocation = (): Location => ({ pathname: window.location.pathname, hash: window.location.hash });

/** Wait (briefly) until the document is tall enough to restore a scroll position — lazy routes render late. */
function restoreScroll(y: number) {
  const start = performance.now();
  const attempt = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max >= y - 2 || performance.now() - start > 1500) {
      window.scrollTo({ top: Math.min(y, Math.max(0, max)), behavior: 'auto' });
      return;
    }
    requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

/** Scroll to an in-page anchor once its target exists (lazy routes render late). */
function scrollToHashWhenReady(hash: string, reduced: () => boolean) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const start = performance.now();
  const attempt = () => {
    if (document.getElementById(id) || performance.now() - start > 1500) {
      navigateToHash(hash, reduced());
      return;
    }
    requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

/**
 * A small History-API router: real URLs for every page (deep links, browser
 * back/forward), per-route document titles, scroll restoration, focus moved to
 * the new page for keyboard and screen-reader users, and in-page anchors that
 * never scrub through the cinematic sequence.
 */
export function RouterProvider({
  children,
  isReduced,
  titleFor,
}: {
  children: ReactNode;
  isReduced: () => boolean;
  titleFor: (route: Route) => string;
}) {
  const [location, setLocation] = useState<Location>(readLocation);
  const route = useMemo(() => matchRoute(location.pathname), [location.pathname]);
  const pending = useRef<{ kind: 'top' | 'hash' | 'restore'; hash?: string; y?: number } | null>(
    window.location.hash ? { kind: 'hash', hash: window.location.hash } : null,
  );
  const firstRender = useRef(true);
  const reducedRef = useRef(isReduced);
  reducedRef.current = isReduced;

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  const rememberScroll = useCallback(() => {
    const state = (history.state ?? {}) as HistoryState;
    history.replaceState({ ...state, scrollY: window.scrollY }, '');
  }, []);

  const navigate = useCallback(
    (to: string, opts?: { replace?: boolean }) => {
      const url = new URL(to, window.location.href);
      const next: Location = { pathname: url.pathname, hash: url.hash };
      if (!url.hash && url.pathname === window.location.pathname) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }
      rememberScroll();
      if (opts?.replace) history.replaceState({ scrollY: 0 }, '', url.pathname + url.search + url.hash);
      else history.pushState({ scrollY: 0 }, '', url.pathname + url.search + url.hash);
      pending.current = url.hash ? { kind: 'hash', hash: url.hash } : { kind: 'top' };
      setLocation(next);
    },
    [rememberScroll],
  );

  // Browser back / forward.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const state = (e.state ?? {}) as HistoryState;
      const loc = readLocation();
      pending.current =
        typeof state.scrollY === 'number'
          ? { kind: 'restore', y: state.scrollY }
          : loc.hash
            ? { kind: 'hash', hash: loc.hash }
            : { kind: 'top' };
      setLocation(loc);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Delegate same-origin link clicks.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== '_self') || link.hasAttribute('download') || link.dataset.native !== undefined) return;
      const decision = classifyLink(link.getAttribute('href') ?? '', {
        origin: window.location.origin,
        pathname: window.location.pathname,
      });
      if (decision.kind === 'external') return;
      event.preventDefault();
      if (decision.kind === 'hash') {
        navigateToHash(decision.hash, reducedRef.current());
        return;
      }
      navigate(decision.pathname + decision.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  // Title, focus and scroll after each route change.
  useLayoutEffect(() => {
    document.title = titleFor(route);
    const job = pending.current;
    pending.current = null;
    const initial = firstRender.current;
    firstRender.current = false;
    if (job?.kind === 'hash' && job.hash) scrollToHashWhenReady(job.hash, () => reducedRef.current());
    else if (job?.kind === 'restore' && typeof job.y === 'number') restoreScroll(job.y);
    else if (job?.kind === 'top') window.scrollTo({ top: 0, behavior: 'auto' });
    if (!initial && job?.kind !== 'hash') {
      // Move focus to the new page so assistive tech starts reading it.
      const main = document.getElementById('main');
      main?.focus({ preventScroll: true });
    }
  }, [routeKey(route), location.hash]);

  const value = useMemo(() => ({ route, location, navigate }), [route, location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <RouterProvider>');
  return ctx;
}

/** A plain <a> — clicks are handled by the router's delegated listener. */
export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}
