import { Logo } from '../brand/Logo';
import { site } from '../content/site';

export function Footer() {
  const { footer } = site;
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <a href="/#top" className="site-footer__brand" aria-label={`${site.name} — home`}>
          <Logo />
        </a>
        <p className="site-footer__line">{footer.line}</p>
      </div>
      <div className="site-footer__rule" aria-hidden="true" />
      <div className="site-footer__bottom">
        <nav aria-label="Footer">
          <ul className="site-footer__nav">
            {site.nav.map((n) => (
              <li key={n.id}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
            <li>
              <a href={site.navCta.href}>{site.navCta.label}</a>
            </li>
            <li>
              <a href={footer.privacy.href}>{footer.privacy.label}</a>
            </li>
          </ul>
        </nav>
        <p className="site-footer__tags mono">
          {footer.tags.map((t, i) => (
            <span key={t}>
              {i > 0 && <span aria-hidden="true"> / </span>}
              {t}
            </span>
          ))}
        </p>
        <p className="site-footer__legal mono">
          © {new Date().getFullYear()} {site.name}. {footer.legal}
        </p>
      </div>
    </footer>
  );
}
