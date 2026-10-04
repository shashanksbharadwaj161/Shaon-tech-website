import { useCallback, useEffect, useRef } from 'react';
import { CASES, type CaseStudy } from '../content/cases';
import { site } from '../content/site';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { useMotion } from '../motion/MotionProvider';
import { PATHS } from '../router/routes';
import { LampDrawing, PavilionDrawing } from '../ui/ConceptDrawings';
import { MediaImage } from '../ui/MediaImage';

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

/**
 * Three studio concepts in a perspective stage. As the section scrolls in, the
 * panels fan out from a stacked deck into a row; a fine pointer tilts the
 * stage. Every panel is an ordinary link, and the same links follow as a
 * plain list.
 */
export function Work() {
  const { work } = site;
  const { reduced, animate } = useMotion();
  const stage = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((p: number) => {
    stage.current?.style.setProperty('--t', p.toFixed(3));
  }, []);
  useScrollProgress(stage, onProgress, { kind: 'enter', start: 1.05, end: 0.62 }, reduced);

  useEffect(() => {
    const el = stage.current;
    if (!el || !animate || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const leave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
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
          {work.title}
        </h2>
        <p className="section__intro">{work.intro}</p>
      </header>

      <div className="work-stage" ref={stage}>
        <ul className="work-stage__deck">
          {CASES.map((c, i) => (
            <li key={c.slug} className="work-panel" style={{ ['--i' as string]: i }}>
              <a className="work-panel__link" href={PATHS.case(c.slug)} aria-describedby={`work-panel-${c.slug}`}>
                <span className="work-panel__top mono">
                  <span>{c.index}</span>
                  <span className="work-panel__tag">Studio concept</span>
                </span>
                <span className="work-panel__visual">
                  <PanelVisual c={c} />
                </span>
                <span className="work-panel__title">{c.title}</span>
                <span className="work-panel__kind mono">{c.kind}</span>
                <span className="work-panel__summary" id={`work-panel-${c.slug}`}>
                  {c.summary}
                </span>
                <span className="work-panel__open mono">
                  {work.open}
                  <span aria-hidden="true"> →</span>
                </span>
              </a>
            </li>
          ))}
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
