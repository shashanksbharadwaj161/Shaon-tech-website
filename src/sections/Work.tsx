import { useCallback, useEffect, useRef } from 'react';
import { CASES, type CaseStudy } from '../content/cases';
import { site } from '../content/site';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { useMotion } from '../motion/MotionProvider';
import { PATHS } from '../router/routes';
import { LampDrawing, PavilionDrawing } from '../ui/ConceptDrawings';
import { MediaImage } from '../ui/MediaImage';
import { MotionText } from '../ui/MotionText';
import '../styles/work-motion.css';

const PANEL_SIZES = '(min-width: 1100px) 380px, (min-width: 720px) 32vw, 88vw';

/** A tiny code-native workspace: filter chips, counts and a board. */
function WorkspacePreview() {
  return (
    <div className="wp-mini" aria-hidden="true">
      <div className="wp-mini__chips">
        <span className="on">Review · 4</span>
        <span>Done · 7</span>
        <span>Backlog · 6</span>
      </div>
      <div className="wp-mini__board">
        {[3, 2, 4].map((n, c) => (
          <div key={c} className="wp-mini__col">
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className={i === 0 && c === 0 ? 'hl' : undefined} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelVisual({ c }: { c: CaseStudy }) {
  if (c.media === 'lamp') {
    return <MediaImage media="lamp" sizes={PANEL_SIZES} fallback={<LampDrawing view="front" />} className="work-panel__media" />;
  }
  if (c.media === 'pavilion') {
    return <MediaImage media="pavilion" sizes={PANEL_SIZES} fallback={<PavilionDrawing />} className="work-panel__media" />;
  }
  return <WorkspacePreview />;
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/** Each preview has its own entrance and horizontal swipe window. Only its
 * visual is masked; the case title, description and link always stay readable. */
function WorkPanel({ c, index }: { c: CaseStudy; index: number }) {
  const { animate } = useMotion();
  const visual = useRef<HTMLSpanElement>(null);
  const onProgress = useCallback((p: number) => {
    visual.current?.style.setProperty('--visual-t', p.toFixed(3));
  }, []);
  useScrollProgress(visual, onProgress, { kind: 'enter', start: 1.05, end: 0.42 }, !animate);

  useEffect(() => {
    const el = visual.current;
    if (!el) return;
    el.style.setProperty('--window-t', '1');
    el.dataset.visible = 'false';
    if (!animate || !('IntersectionObserver' in window)) return;
    let visible = false;
    const setVisibility = () => {
      el.dataset.visible = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // On phones, the overflow deck clips this intersection. Swiping a new
      // panel into view opens its frame even after the vertical entrance ends.
      el.style.setProperty('--window-t', clamp((entry.intersectionRatio - 0.08) / 0.72).toFixed(3));
      setVisibility();
    }, { threshold: Array.from({ length: 26 }, (_, i) => i / 25) });
    observer.observe(el);
    document.addEventListener('visibilitychange', setVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', setVisibility);
      el.style.setProperty('--window-t', '1');
      el.dataset.visible = 'false';
    };
  }, [animate]);

  return (
    <li className="work-panel" style={{ ['--i' as string]: index }}>
      <a className="work-panel__link" href={PATHS.case(c.slug)} aria-describedby={`work-panel-${c.slug}`}>
        <span className="work-panel__top mono">
          <span>{c.index}</span>
          <span className="work-panel__tag">Studio concept</span>
        </span>
        <span className="work-panel__visual work-motion__visual" ref={visual}>
          <span className="work-motion__mask">
            <span className="work-motion__image"><PanelVisual c={c} /></span>
          </span>
          <span className="work-motion__fold" aria-hidden="true" />
        </span>
        <span className="work-panel__title">{c.title}</span>
        <span className="work-panel__kind mono">{c.kind}</span>
        <span className="work-panel__summary" id={`work-panel-${c.slug}`}>{c.summary}</span>
        <span className="work-panel__open mono">
          {site.work.open}<span aria-hidden="true"> →</span>
        </span>
      </a>
    </li>
  );
}

/**
 * Three studio concepts in a perspective stage. As the section scrolls in, the
 * panels fan out from a stacked deck into a row; a fine pointer tilts the
 * stage. Every panel is an ordinary link, and the same links follow as a
 * plain list.
 */
export function Work() {
  const { work } = site;
  const { animate } = useMotion();
  const stage = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((p: number) => {
    stage.current?.style.setProperty('--t', p.toFixed(3));
  }, []);
  useScrollProgress(stage, onProgress, { kind: 'enter', start: 1.05, end: 0.62 }, !animate);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    if (!animate) return;
    let raf = 0;
    let card: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    let pointerType = '';
    let pressed = false;
    const fine = window.matchMedia('(pointer: fine)');
    const clearCard = () => {
      if (!card) return;
      card.style.setProperty('--wx', '0');
      card.style.setProperty('--wy', '0');
      card.style.setProperty('--contact', '0');
    };
    const apply = () => {
      raf = 0;
      if (document.hidden) return;
      const active = pointerType === 'mouse' || pressed;
      const r = el.getBoundingClientRect();
      const tilt = active && pointerType === 'mouse' && fine.matches;
      const px = tilt ? clamp(((x - r.left) / r.width) * 2 - 1, -1, 1) : 0;
      const py = tilt ? clamp(((y - r.top) / r.height) * 2 - 1, -1, 1) : 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      if (!card) return;
      const cr = card.getBoundingClientRect();
      const cx = clamp((x - cr.left) / cr.width);
      const cy = clamp((y - cr.top) / cr.height);
      card.style.setProperty('--wx', (active ? cx * 2 - 1 : 0).toFixed(3));
      card.style.setProperty('--wy', (active ? cy * 2 - 1 : 0).toFixed(3));
      card.style.setProperty('--wl-x', `${(cx * 100).toFixed(2)}%`);
      card.style.setProperty('--wl-y', `${(cy * 100).toFixed(2)}%`);
      card.style.setProperty('--contact', active ? (pressed ? '1' : '0.65') : '0');
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      pointerType = e.pointerType;
      const next = e.target instanceof Element ? e.target.closest<HTMLElement>('.work-panel__link') : null;
      if (next !== card) {
        clearCard();
        card = next;
      }
      schedule();
    };
    const down = (e: PointerEvent) => { pressed = true; move(e); };
    const up = () => { pressed = false; schedule(); };
    const leave = () => {
      pressed = false;
      pointerType = '';
      clearCard();
      card = null;
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const hidden = () => { if (document.hidden) leave(); };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointerleave', leave);
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', leave, { passive: true });
    document.addEventListener('visibilitychange', hidden);
    return () => {
      leave();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', leave);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [animate]);

  return (
    <section id="work" className="section section--ink work" aria-labelledby="work-title">
      <header className="section__head" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">02</span>
          {work.eyebrow}
        </p>
        <h2 id="work-title" className="section__title">
          <MotionText effect="assemble">{work.title}</MotionText>
        </h2>
        <p className="section__intro">{work.intro}</p>
      </header>

      <div className="work-stage" ref={stage}>
        <ul className="work-stage__deck">
          {CASES.map((c, i) => <WorkPanel key={c.slug} c={c} index={i} />)}
        </ul>
      </div>

      <nav className="work-list" aria-labelledby="work-list-title">
        <h3 id="work-list-title" className="work-list__title mono">
          {work.listTitle}
        </h3>
        <ol>
          {CASES.map((c) => (
            <li key={c.slug}>
              <a href={PATHS.case(c.slug)} className="work-list__link">
                <span className="work-list__index mono">{c.index}</span>
                <span className="work-list__name">{c.title}</span>
                <span className="work-list__kind">
                  {c.kind} · Studio concept · {c.demoLabel.replace('Working demo — ', '')}
                </span>
                <span className="work-list__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
