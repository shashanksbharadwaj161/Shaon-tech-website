import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { qualityFor, readDeviceProfile } from '../lib/env';
import { useMotion } from '../motion/MotionProvider';
import { FallbackStage } from './FallbackStage';

const StageCanvas = lazy(() => import('../scene/StageCanvas'));

class StageErrorBoundary extends Component<{ onError: (error: Error) => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useStageVisibility(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { rootMargin: '10% 0px' });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref]);
  return inView && tabVisible;
}

interface StageProps {
  /** `cinematic`: sticky behind hero + sequence. `static`: a still frame inside the hero. */
  mode: 'cinematic' | 'static';
}

/**
 * The visual stage. Shows the SVG/CSS fallback immediately, lazily loads the
 * WebGL scene after first paint, and crossfades to it once its first frame has
 * rendered. Any initialisation error, shader failure or context loss drops back
 * to the fallback for the rest of the visit.
 */
export function Stage({ mode }: StageProps) {
  const { animate, reduced, renderer, failRenderer } = useMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useStageVisibility(ref);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const quality = useMemo(() => qualityFor(readDeviceProfile()), []);

  useEffect(() => {
    if (renderer !== 'webgl') return;
    // Let the HTML paint first; three.js arrives a beat later.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setLoad(true), { timeout: 600 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setLoad(true), 120);
    return () => window.clearTimeout(id);
  }, [renderer]);

  const showCanvas = renderer === 'webgl' && load;
  const canvasReady = showCanvas && ready;

  return (
    <div ref={ref} className="stage" data-mode={mode} data-ready={canvasReady ? 'true' : 'false'}>
      <div className="stage__backdrop" />
      <FallbackStage mode={mode} hidden={canvasReady} />
      {showCanvas && (
        <StageErrorBoundary onError={(e) => failRenderer(`init-error: ${e.message}`)}>
          <Suspense fallback={null}>
            <StageCanvas
              animate={animate}
              interactive={animate && !reduced}
              visible={visible}
              quality={quality}
              onReady={() => setReady(true)}
              onFail={failRenderer}
            />
          </Suspense>
        </StageErrorBoundary>
      )}
      <div className="stage__vignette" />
    </div>
  );
}
