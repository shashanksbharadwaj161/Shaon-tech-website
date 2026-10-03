import { useEffect, useRef } from 'react';
import { Logo } from '../brand/Logo';
import { site, type SectionId } from '../content/site';

interface MobileMenuProps {
  open: boolean;
  active: SectionId | null;
  /** `restoreFocus`: return focus to the Menu button (not when navigating away). */
  onClose: (restoreFocus: boolean) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Full-screen navigation dialog for small screens: focus moves in on open, Tab
 * is trapped, Escape closes and returns focus to the Menu button, the page
 * behind is inert and does not scroll.
 */
export function MobileMenu({ open, active, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add('is-menu-open');
    const main = document.getElementById('main');
    const footer = document.querySelector<HTMLElement>('.site-footer');
    main?.setAttribute('inert', '');
    footer?.setAttribute('inert', '');
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(true);
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 960px)');
    const onWide = () => mq.matches && onClose(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
      root.classList.remove('is-menu-open');
      main?.removeAttribute('inert');
      footer?.removeAttribute('inert');
    };
  }, [open, onClose]);

  const items = [...site.nav, { id: 'start' as const, label: site.navCta.label }];

  return (
    <div
      ref={panelRef}
      id="mobile-menu"
      className="mobile-menu"
      data-open={open ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      inert={!open}
    >
      <div className="mobile-menu__bar">
        <Logo />
        <button ref={closeRef} type="button" className="menu-toggle menu-toggle--close" onClick={() => onClose(true)}>
          <span className="menu-toggle__label">Close</span>
          <span className="menu-toggle__icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>
      <nav aria-label="Site" className="mobile-menu__nav">
        <ol className="mobile-menu__list">
          {items.map((item, i) => (
            <li key={item.id} style={{ ['--i' as string]: i }}>
              <a
                href={`#${item.id}`}
                className={`mobile-menu__link${item.id === 'start' ? ' mobile-menu__link--cta' : ''}`}
                aria-current={active === item.id ? 'true' : undefined}
                onClick={() => onClose(false)}
              >
                <span className="mobile-menu__index mono" aria-hidden="true">
                  0{i + 1}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <p className="mobile-menu__foot mono">{site.hero.body}</p>
    </div>
  );
}
