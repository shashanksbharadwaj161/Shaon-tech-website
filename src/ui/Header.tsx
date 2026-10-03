import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '../brand/Logo';
import { site, type SectionId } from '../content/site';
import { CtaLink } from './CtaLink';
import { MobileMenu } from './MobileMenu';

export function Header({ active }: { active: SectionId | null }) {
  const [elevated, setElevated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let last = false;
    const onScroll = () => {
      const next = window.scrollY > 24;
      if (next !== last) {
        last = next;
        setElevated(next);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    // Undo the lock synchronously: a menu link's own click then navigates and
    // focuses its destination in the same event, before React re-renders.
    document.documentElement.classList.remove('is-menu-open');
    document.getElementById('main')?.removeAttribute('inert');
    document.querySelector('.site-footer')?.removeAttribute('inert');
    if (restoreFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  return (
    <header className="site-header" data-elevated={elevated ? 'true' : 'false'}>
      <div className="site-header__inner">
        <a className="site-header__brand" href="#top" aria-label={`${site.name} — home`}>
          <Logo />
        </a>
        <nav className="site-nav" aria-label="Primary">
          <ul className="site-nav__list">
            {site.nav.map((item) => (
              <li key={item.id}>
                <a
                  className="site-nav__link"
                  href={`#${item.id}`}
                  aria-current={active === item.id ? 'true' : undefined}
                >
                  <span className="site-nav__roll">
                    <span>{item.label}</span>
                    <span aria-hidden="true">{item.label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <span className="site-nav__rule" aria-hidden="true" />
          <CtaLink href={site.navCta.href} label={site.navCta.label} size="sm" />
        </nav>
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <span className="menu-toggle__label">Menu</span>
          <span className="menu-toggle__icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>
      <MobileMenu open={menuOpen} active={active} onClose={closeMenu} />
    </header>
  );
}
