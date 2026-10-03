import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  chooseRenderer,
  parseQuerySwitches,
  probeWebGL,
  resolveReducedMotion,
  systemPrefersReducedMotion,
  type QuerySwitches,
  type RendererMode,
} from '../lib/env';

export interface MotionContextValue {
  /** Effective reduced motion (system preference or ?motion=reduce). */
  reduced: boolean;
  /** Visitor paused autonomous motion. */
  paused: boolean;
  /** Autonomous motion may run. */
  animate: boolean;
  togglePaused: () => void;
  renderer: RendererMode;
  /** Why WebGL was not used / was abandoned (for QA readout). */
  rendererReason: string;
  failRenderer: (reason: string) => void;
  switches: QuerySwitches;
}

const MotionContext = createContext<MotionContextValue | null>(null);
const PAUSE_KEY = 'shaon:motion-paused';

function readPaused(): boolean {
  try {
    return sessionStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return false;
  }
}

function initialRenderer(switches: QuerySwitches): { mode: RendererMode; reason: string } {
  if (switches.renderer === 'fallback') return { mode: 'fallback', reason: 'forced by query (?fallback=1)' };
  const support = switches.renderer === 'webgl' ? 'webgl2' : probeWebGL();
  const mode = chooseRenderer(switches.renderer, support);
  return { mode, reason: mode === 'webgl' ? `webgl (${support})` : 'WebGL unavailable' };
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const switches = useMemo(() => parseQuerySwitches(window.location.search), []);
  const [systemReduced, setSystemReduced] = useState(systemPrefersReducedMotion);
  const [paused, setPaused] = useState(readPaused);
  const [renderer, setRenderer] = useState(() => initialRenderer(switches));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setSystemReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reduced = resolveReducedMotion(switches.motion, systemReduced);
  const animate = !reduced && !paused;

  const togglePaused = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      try {
        sessionStorage.setItem(PAUSE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable: preference lasts for this page view only */
      }
      return next;
    });
  }, []);

  const failRenderer = useCallback((reason: string) => {
    setRenderer((current) => (current.mode === 'fallback' ? current : { mode: 'fallback', reason }));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = reduced ? 'reduced' : 'full';
    root.dataset.paused = String(paused);
    root.dataset.renderer = renderer.mode;
  }, [reduced, paused, renderer.mode]);

  const value = useMemo<MotionContextValue>(
    () => ({
      reduced,
      paused,
      animate,
      togglePaused,
      renderer: renderer.mode,
      rendererReason: renderer.reason,
      failRenderer,
      switches,
    }),
    [reduced, paused, animate, togglePaused, renderer, failRenderer, switches],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error('useMotion must be used inside <MotionProvider>');
  return ctx;
}
