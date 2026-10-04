import type { ReactNode, RefObject } from 'react';
import { site } from '../content/site';
import { CtaLink } from '../ui/CtaLink';
import { HeroHeadline } from '../ui/HeroHeadline';

interface HeroProps {
  heroRef: RefObject<HTMLElement | null>;
  /** In reduced-motion mode the still stage lives inside the hero. */
  stage?: ReactNode;
}

export function Hero({ heroRef, stage }: HeroProps) {
  const { hero } = site;

  return (
    <section id="top" ref={heroRef} className="hero" aria-labelledby="hero-title">
      {stage}
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="hero__label mono">{hero.labelTop.join(' ')}</p>
          <HeroHeadline headline={hero.headline} />
          <div className="hero__footer">
            <p className="hero__body">{hero.body}</p>
            <div className="hero__actions">
              <CtaLink href={hero.primary.href} label={hero.primary.label} />
              <CtaLink href={hero.secondary.href} label={hero.secondary.label} variant="ghost" icon="down" />
            </div>
          </div>
        </div>
        <p className="hero__aside hero__aside--top mono">
          {hero.asideTop.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </p>
      </div>
      <a className="hero__cue mono" href="#story">
        <span className="hero__cue-line" aria-hidden="true" />
        {hero.scrollCue}
      </a>
    </section>
  );
}
