import { useEffect, useRef, type MouseEventHandler } from 'react';

type Icon = 'right' | 'down' | 'up';

function Arrow({ dir }: { dir: Icon }) {
  const rotate = dir === 'down' ? 90 : dir === 'up' ? -90 : 0;
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M2 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

/**
 * Subtle magnetic pull towards the pointer (fine pointers only, motion allowed).
 * Writes CSS variables; never re-renders.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.22, max = 7) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      if (document.documentElement.dataset.motion === 'reduced' || document.documentElement.dataset.paused === 'true') return;
      const r = el.getBoundingClientRect();
      const x = Math.max(-max, Math.min(max, (e.clientX - (r.left + r.width / 2)) * strength));
      const y = Math.max(-max, Math.min(max, (e.clientY - (r.top + r.height / 2)) * strength));
      el.style.setProperty('--mx', `${x.toFixed(2)}px`);
      el.style.setProperty('--my', `${y.toFixed(2)}px`);
    };
    const leave = () => {
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength, max]);
  return ref;
}

interface CtaLinkProps {
  href: string;
  label: string;
  variant?: 'primary' | 'ghost' | 'line';
  size?: 'md' | 'sm';
  icon?: Icon;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/** A real link styled as a button, with a text roll and arrow travel on hover/focus. */
export function CtaLink({ href, label, variant = 'primary', size = 'md', icon = 'right', className, onClick }: CtaLinkProps) {
  const ref = useMagnetic<HTMLAnchorElement>();
  return (
    <a ref={ref} href={href} onClick={onClick} className={['cta', `cta--${variant}`, `cta--${size}`, className].filter(Boolean).join(' ')}>
      <span className="cta__roll">
        <span className="cta__text">{label}</span>
        <span className="cta__text cta__text--echo" aria-hidden="true">
          {label}
        </span>
      </span>
      <span className="cta__icon" aria-hidden="true">
        <span className="cta__arrow">
          <Arrow dir={icon} />
        </span>
        <span className="cta__arrow cta__arrow--echo">
          <Arrow dir={icon} />
        </span>
      </span>
    </a>
  );
}
