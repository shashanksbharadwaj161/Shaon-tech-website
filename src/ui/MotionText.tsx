import { Fragment, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { RIBBON } from '../brand/markGeometry';
import { useMotion } from '../motion/MotionProvider';
import '../styles/motion-type.css';

type TypeEffect = 'fold' | 'assemble' | 'scan' | 'outline' | 'shine';

interface MotionTextProps {
  children: string;
  effect?: TypeEffect;
  /** Pinned chapters already have a native-scroll-driven active state. */
  trigger?: 'view' | 'chapter';
}

const FOLD_ANGLE = (Math.atan(RIBBON.params.slope) * 180) / Math.PI;

/**
 * Kinetic words remain ordinary heading text. Decorative duplicates are hidden
 * from assistive technology; spaces and the original heading IDs stay intact.
 * Visibility is discrete IO state, never React state or a second scroll loop.
 */
export function MotionText({ children, effect = 'fold', trigger = 'view' }: MotionTextProps) {
  const root = useRef<HTMLSpanElement>(null);
  const { animate } = useMotion();

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !animate || !('IntersectionObserver' in window)) return;
    const rect = el.getBoundingClientRect();
    let inview = rect.bottom > 0 && rect.top < window.innerHeight * 0.92;
    const visibility = () => { el.dataset.inview = String(inview && !document.hidden); };
    visibility();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          inview = entry.isIntersecting;
          visibility();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [animate, trigger]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !animate || effect !== 'shine') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const shine = () => {
      // A touch acknowledges contact with the same directional light as chrome.
      // Let an existing pass finish rather than restarting it on every finger move.
      if (el.dataset.touch === 'true') return;
      el.dataset.touch = 'true';
      // Coarse pointers may retain :hover after a tap. Restart the existing
      // light pass explicitly so the next contact still gets feedback.
      if (typeof CSSAnimation !== 'undefined') {
        for (const animation of el.getAnimations({ subtree: true })) {
          if (animation instanceof CSSAnimation && animation.animationName === 'type-scan') animation.currentTime = 0;
        }
      }
      timer = setTimeout(() => { delete el.dataset.touch; }, 1200);
    };
    el.addEventListener('pointerdown', shine, { passive: true });
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      delete el.dataset.touch;
      el.removeEventListener('pointerdown', shine);
    };
  }, [animate, effect]);

  let wordIndex = 0;
  const traced = effect === 'scan' || effect === 'outline' || effect === 'shine';
  return (
    <span
      ref={root}
      className={`motion-type motion-type--${effect}`}
      data-trigger={trigger}
      data-running={String(animate)}
      style={{ '--type-angle': `${FOLD_ANGLE.toFixed(2)}deg` } as CSSProperties}
    >
      {children.split(/(\s+)/).map((token, i) => {
        if (!token || /^\s+$/.test(token)) return <Fragment key={i}>{token}</Fragment>;
        const index = wordIndex++;
        return (
          <span
            className="motion-type__word"
            key={i}
            style={{ '--type-i': index, '--type-side': index % 2 ? 1 : -1 } as CSSProperties}
          >
            <span className="motion-type__ink">{token}</span>
            {traced && <span className="motion-type__trace" aria-hidden="true">{token}</span>}
          </span>
        );
      })}
    </span>
  );
}
