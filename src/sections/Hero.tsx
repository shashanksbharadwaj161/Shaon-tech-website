import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { site } from '../content/site';
import { CtaLink } from '../ui/CtaLink';

/**
 * Measures the first headline line so the paper panel (from the approved
 * board: ink type on paper bleeding into the dark stage) hugs it exactly at
 * every size and after webfonts load.
 */
function usePaperPanel(gridRef: RefObject<HTMLElement | null>, lineRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = gridRef.current;
    const line = lineRef.current;
    if (!hero || !line) return;
    const measure = () => {
      const h = hero.getBoundingClientRect();
      const l = line.getBoundingClientRect();
      hero.style.setProperty('--line-top', `${(l.top - h.top).toFixed(1)}px`);
      hero.style.setProperty('--line-bottom', `${(l.bottom - h.top).toFixed(1)}px`);
      hero.style.setProperty('--line-right', `${(l.right - h.left).toFixed(1)}px`);
      hero.dataset.measured = 'true';
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    ro.observe(line);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [gridRef, lineRef]);
}

interface HeroProps {
  heroRef: RefObject<HTMLElement | null>;
  /** In reduced-motion mode the still stage lives inside the hero. */
  stage?: ReactNode;
}

export function Hero({ heroRef, stage }: HeroProps) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  usePaperPanel(gridRef, lineRef);
  const { hero } = site;

  return (
    <section id="top" ref={heroRef} className="hero" aria-labelledby="hero-title">
      {stage}
      <div className="hero__grid" ref={gridRef}>
        <div className="hero__paper" aria-hidden="true" />
        <p className="hero__label mono">
          {hero.labelTop.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </p>
        <h1 id="hero-title" className="hero__title">
          <span className="hero__line hero__line--lead" ref={lineRef}>
            <span className="hero__line-inner">
              {hero.headline.lead}
            </span>
          </span>{' '}
          <span className="hero__line hero__line--tail">
            <span className="hero__line-inner">
              <span className="hero__accent">{hero.headline.accent}</span> {hero.headline.tail}
              <span className="hero__stop">{hero.headline.stop}</span>
            </span>
          </span>
        </h1>
        <div className="hero__footer">
          <p className="hero__body">{hero.body}</p>
          <div className="hero__actions">
            <CtaLink href={hero.primary.href} label={hero.primary.label} />
            <CtaLink href={hero.secondary.href} label={hero.secondary.label} variant="ghost" icon="down" />
          </div>
        </div>
        <p className="hero__aside hero__aside--top mono">
          {hero.asideTop.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </p>
        <p className="hero__aside hero__aside--bottom mono">
          {hero.asideBottom.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </p>
        <p className="hero__belief mono">{hero.belief}</p>
        <span className="hero__rule" aria-hidden="true" />
      </div>
      <a className="hero__cue mono" href="#story">
        <span className="hero__cue-line" aria-hidden="true" />
        {hero.scrollCue}
      </a>
    </section>
  );
}
