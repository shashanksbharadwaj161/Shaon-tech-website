import { useEffect, useRef, type CSSProperties } from 'react';
import { live, pressEnergy, subscribeLive } from '../lib/liveState';
import { useMotion } from '../motion/MotionProvider';
import '../styles/hero-kinetic.css';

interface HeroHeadlineProps {
  headline: Readonly<{ lead: string; accent: string; tail: string; stop: string }>;
}

/** Material response shares the scene's passive pointer/touch channel. */
function useHeadlineMaterial(ref: React.RefObject<HTMLHeadingElement | null>, animate: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let inView = true;
    let visible = document.visibilityState !== 'hidden';
    const running = () => animate && inView && visible;
    const reset = () => {
      el.style.setProperty('--hk-px', '0');
      el.style.setProperty('--hk-py', '0');
      el.style.setProperty('--hk-energy', '0');
    };
    const update = () => {
      raf = 0;
      if (!running()) return;
      const p = live.pointer;
      const energy = pressEnergy();
      el.style.setProperty('--hk-px', (p.active ? p.x : 0).toFixed(3));
      el.style.setProperty('--hk-py', (p.active ? p.y : 0).toFixed(3));
      el.style.setProperty('--hk-energy', energy.toFixed(3));
      // A touch/press adds a brief edge-light pulse, then the loop stops.
      if (energy > 0.015) raf = requestAnimationFrame(update);
    };
    const schedule = () => {
      if (running() && !raf) raf = requestAnimationFrame(update);
    };
    const synchronize = () => {
      el.dataset.active = String(running());
      if (running()) schedule();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        reset();
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      inView = !!entry?.isIntersecting;
      synchronize();
    });
    io.observe(el);
    const onVisibility = () => {
      visible = document.visibilityState !== 'hidden';
      synchronize();
    };
    const unsubscribe = subscribeLive(schedule);
    document.addEventListener('visibilitychange', onVisibility);
    synchronize();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      reset();
    };
  }, [animate, ref]);
}

function Word({ text, start, accent = false }: { text: string; start: number; accent?: boolean }) {
  return (
    <span className={`hk-word${accent ? ' hk-word--cobalt' : ''}`}>
      {Array.from(text).map((glyph, i) => glyph === ' ' ? (
        <span key={`${i}-space`} className="hk-space">{' '}</span>
      ) : (
        <span
          key={`${i}-${glyph}`}
          className={`hk-letter${glyph === '.' ? ' hk-letter--stop' : ''}`}
          data-glyph={glyph}
          style={{ '--glyph': start + i } as CSSProperties}
        >
          <span className="hk-letter__face">{glyph}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * One readable HTML headline. Decorative bevels are CSS layers of those same
 * glyphs; the heading exposes the complete phrase once to assistive tech.
 * The product row wraps only between words, so it can use two or three lines.
 */
export function HeroHeadline({ headline }: HeroHeadlineProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { animate } = useMotion();
  useHeadlineMaterial(ref, animate);
  const leadLength = Array.from(headline.lead).length;
  const accentLength = Array.from(headline.accent).length;
  return (
    <h1
      ref={ref}
      id="hero-title"
      className="hero__title hk-headline"
      aria-label={`${headline.lead} ${headline.accent} ${headline.tail}${headline.stop}`}
      data-kinetic={animate ? 'true' : 'false'}
      data-active={animate ? 'true' : 'false'}
    >
      <span className="hk-line hk-line--lead" aria-hidden="true">
        <Word text={headline.lead} start={0} />
      </span>{' '}
      <span className="hk-line hk-line--product" aria-hidden="true">
        <Word text={headline.accent} start={leadLength} accent />{' '}
        <Word text={`${headline.tail}${headline.stop}`} start={leadLength + accentLength} />
      </span>
    </h1>
  );
}
