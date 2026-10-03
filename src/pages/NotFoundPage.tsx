import { FoldedMark } from '../brand/FoldedMark';
import { CASES } from '../content/cases';
import { PATHS } from '../router/routes';

export function NotFoundPage({ path }: { path: string }) {
  return (
    <article className="doc-page doc-page--404" aria-labelledby="nf-title">
      <header className="doc-page__head">
        <FoldedMark className="nf__mark" />
        <p className="eyebrow mono">
          <span className="eyebrow__index">404</span>
          Not found
        </p>
        <h1 id="nf-title" className="doc-page__title">
          This page hasn’t been folded yet.
        </h1>
        <p className="doc-page__lead">
          Nothing lives at <code className="nf__path">{path}</code>. These might be what you were looking for:
        </p>
      </header>
      <nav className="nf__links" aria-label="Suggested pages">
        <ul>
          <li>
            <a href={PATHS.home}>
              <span className="mono">Home</span>Ideas into living products
            </a>
          </li>
          {CASES.map((c) => (
            <li key={c.slug}>
              <a href={PATHS.case(c.slug)}>
                <span className="mono">{c.index} · Studio concept</span>
                {c.title}
              </a>
            </li>
          ))}
          <li>
            <a href={PATHS.start}>
              <span className="mono">Brief</span>Start a project
            </a>
          </li>
          <li>
            <a href={PATHS.privacy}>
              <span className="mono">Privacy</span>What happens to your data
            </a>
          </li>
        </ul>
      </nav>
    </article>
  );
}
