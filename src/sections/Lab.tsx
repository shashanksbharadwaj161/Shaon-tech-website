import { Component, lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FoldedMark } from '../brand/FoldedMark';
import { site } from '../content/site';
import { qualityFor, readDeviceProfile } from '../lib/env';
import {
  isDefault,
  LAB_CONTROLS,
  LAB_DEFAULTS,
  labLive,
  notifyLab,
  setLabParams,
  withParam,
  type LabGroup,
  type LabParams,
} from '../lib/labParams';
import { useMotion } from '../motion/MotionProvider';
import { MotionText } from '../ui/MotionText';
import { SignalLanes } from '../stage/SignalLanes';

const LabCanvas = lazy(() => import('../scene/LabCanvas'));

class LabBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Still SVG version of the lab that still responds to every control. */
function LabFallback({ params }: { params: LabParams }) {
  const style = {
    '--fold': params.fold / 100,
    '--twist': params.twist,
    '--exposure': params.exposure,
    '--rim': params.rim,
    '--light': params.lightAngle / 360,
    '--signal': params.signal / 100,
  } as CSSProperties;
  return (
    <div className="lab-fallback" style={style} aria-hidden="true">
      <SignalLanes className="lab-fallback__lanes" />
      <div className="lab-fallback__mark">
        <FoldedMark variant="chrome" />
      </div>
    </div>
  );
}

function useInView(ref: React.RefObject<HTMLElement | null>, rootMargin: string): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

const GROUP_ORDER: LabGroup[] = ['light', 'form', 'signal'];

export function Lab() {
  const { lab } = site;
  const { animate, reduced, renderer } = useMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const near = useInView(viewport, '400px 0px');
  const onScreen = useInView(viewport, '0px');
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden');
  const [params, setParams] = useState<LabParams>({ ...LAB_DEFAULTS });
  const [localPause, setLocalPause] = useState(false);
  const [message, setMessage] = useState('');
  const quality = useMemo(() => qualityFor(readDeviceProfile()), []);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Keep the scene channel in sync; restore defaults when leaving the page.
  useEffect(() => {
    setLabParams(params);
  }, [params]);
  useEffect(() => () => setLabParams({ ...LAB_DEFAULTS }), []);

  const update = useCallback((key: keyof LabParams, value: number) => {
    setParams((p) => withParam(p, key, value));
  }, []);

  const reset = () => {
    setParams({ ...LAB_DEFAULTS });
    setMessage('Lab reset to its default settings.');
  };

  // Optional drag over the viewport steers light and tilt. touch-action: pan-y
  // (CSS) keeps vertical page scrolling native; a vertical swipe simply scrolls.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const set = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      labLive.input.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      labLive.input.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    const down = (e: PointerEvent) => {
      set(e);
      labLive.input.active = true;
      labLive.input.pressAt = performance.now();
      notifyLab();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && !labLive.input.active) return;
      set(e);
      labLive.input.active = true;
      notifyLab();
    };
    const end = () => {
      labLive.input.active = false;
      notifyLab();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      el.removeEventListener('pointerleave', end);
      labLive.input.active = false;
    };
  }, []);

  // Phones: the preview is sticky above the controls. Browsers scroll a
  // focused control into view without knowing about that overlay, so nudge
  // it just below the preview (keyboard / switch / screen-reader focus).
  useEffect(() => {
    const el = viewport.current;
    const form = el?.parentElement?.querySelector('.lab__controls');
    if (!el || !form) return;
    let raf = 0;
    const onFocus = (e: Event) => {
      const target = (e.target as Element).closest('.lab__control, .lab__actions');
      if (!target) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (getComputedStyle(el).position !== 'sticky') return;
        const v = el.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        if (t.left >= v.right || t.right <= v.left) return; // side by side (landscape)
        const gap = 14;
        const dy = t.top < v.bottom + gap ? t.top - (v.bottom + gap) : t.bottom > innerHeight - gap ? t.bottom - (innerHeight - gap) : 0;
        if (dy) window.scrollBy({ top: dy, behavior: 'instant' });
      });
    };
    form.addEventListener('focusin', onFocus);
    return () => {
      cancelAnimationFrame(raf);
      form.removeEventListener('focusin', onFocus);
    };
  }, []);

  const useWebGL = renderer === 'webgl' && !failed;
  const running = animate && !localPause;
  const still = reduced || !useWebGL;
  const defaults = isDefault(params);

  return (
    <section id="lab" className="section section--ink lab" aria-labelledby="lab-title">
      <header className="lab__copy" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">03</span>
          {lab.eyebrow}
        </p>
        <h2 id="lab-title" className="section__title">
          <MotionText effect="scan">{lab.title}</MotionText>
        </h2>
        <p className="section__intro">{lab.body}</p>
      </header>

      <div className="lab__viewport" ref={viewport} data-ready={useWebGL && ready ? 'true' : 'false'} data-paused={running ? 'false' : 'true'}>
        <div className="lab__stage-bg" aria-hidden="true" />
        {(!useWebGL || !ready) && <LabFallback params={params} />}
        {useWebGL && mounted && (
          <LabBoundary onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <LabCanvas
                animate={running}
                visible={onScreen && tabVisible}
                quality={quality}
                onReady={() => setReady(true)}
                onFail={() => setFailed(true)}
              />
            </Suspense>
          </LabBoundary>
        )}
        <p className="lab__hint mono" aria-hidden="true">
          Drag across the S — or use the controls
        </p>
      </div>

      <form className="lab__controls theme-ink" aria-label="Lab controls" onSubmit={(e) => e.preventDefault()}>
        {GROUP_ORDER.map((group) => (
          <fieldset key={group} className="lab__group">
            <legend className="lab__legend mono">{lab.groups[group]}</legend>
            {LAB_CONTROLS.filter((c) => c.group === group).map((c) => {
              const id = `lab-${uid}-${c.key}`;
              const value = params[c.key];
              const fill = ((value - c.min) / (c.max - c.min)) * 100;
              return (
                <div key={c.key} className="lab__control">
                  <div className="lab__control-head">
                    <label htmlFor={id} className="field__label">
                      {c.label}
                    </label>
                    <output htmlFor={id} className="lab__value mono">
                      {c.format(value)}
                    </output>
                  </div>
                  <input
                    id={id}
                    className="range"
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={value}
                    aria-valuetext={c.format(value)}
                    aria-describedby={`${id}-hint`}
                    style={{ ['--fill' as string]: `${fill}%` }}
                    onChange={(e) => update(c.key, Number(e.currentTarget.value))}
                  />
                  <p id={`${id}-hint`} className="field__hint">
                    {c.hint}
                  </p>
                </div>
              );
            })}
          </fieldset>
        ))}
        <div className="lab__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setLocalPause((p) => !p)} disabled={!animate} aria-pressed={localPause}>
            {localPause ? lab.resume : lab.pause}
          </button>
          <button type="button" className="btn btn--quiet" onClick={reset} disabled={defaults}>
            {lab.reset}
          </button>
        </div>
        <p className="field__hint lab__defaults">
          Defaults: light angle 40°, intensity 1.00×, edge glow 0.55×, fold 100%, twist 0°, particles 30%, flow 1.00×.
        </p>
        {still && <p className="notice lab__note">{lab.staticNote}</p>}
        {!animate && !reduced && <p className="field__hint">Motion is paused site-wide; the controls still update the scene.</p>}
        <p className="visually-hidden" role="status">
          {message}
        </p>
      </form>
    </section>
  );
}
