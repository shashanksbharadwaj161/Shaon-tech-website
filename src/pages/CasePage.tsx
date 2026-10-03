import { FoldedMark } from '../brand/FoldedMark';
import { CASES, caseBySlug } from '../content/cases';
import { CommerceDemo } from '../features/commerce/CommerceDemo';
import { StayDemo } from '../features/stay/StayDemo';
import { WorkspaceDemo } from '../features/workspace/WorkspaceDemo';
import { PATHS, type CaseSlug } from '../router/routes';

function Demo({ slug }: { slug: CaseSlug }) {
  switch (slug) {
    case 'product-workspace':
      return <WorkspaceDemo />;
    case 'objects-commerce':
      return <CommerceDemo />;
    case 'hospitality-stay':
      return <StayDemo />;
  }
}

/** /work/:slug — a studio concept case study with its working demo. */
export default function CasePage({ slug }: { slug: CaseSlug }) {
  const c = caseBySlug(slug);
  const i = CASES.findIndex((x) => x.slug === slug);
  const prev = CASES[(i - 1 + CASES.length) % CASES.length]!;
  const next = CASES[(i + 1) % CASES.length]!;

  return (
    <article className="case" aria-labelledby="case-title">
      <header className="case__hero">
        <nav className="case__crumbs mono" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/#work">Work</a>
            </li>
            <li aria-current="page">{c.index}</li>
          </ol>
        </nav>
        <div className="case__hero-grid">
          <div className="case__hero-copy">
            <p className="case__kind mono">
              <span className="sample-label">Studio concept — not client work</span>
              <span>{c.kind}</span>
            </p>
            <h1 id="case-title" className="case__title">
              {c.title}
            </h1>
            <p className="case__summary">{c.summary}</p>
          </div>
          <div className="case__hero-mark" aria-hidden="true">
            <span className="case__index">{c.index.replace('C—', '')}</span>
            <FoldedMark className="case__mark" />
          </div>
        </div>
      </header>

      <section className="case__brief" aria-label="The imagined brief">
        <div className="case__brief-item" data-reveal>
          <h2 className="case__label mono">Imagined problem</h2>
          <p>{c.problem}</p>
        </div>
        <div className="case__brief-item" data-reveal style={{ ['--d' as string]: 1 }}>
          <h2 className="case__label mono">Imagined audience</h2>
          <p>{c.audience}</p>
        </div>
      </section>

      <section className="case__demo" aria-labelledby="case-demo-title">
        <div className="case__demo-head">
          <h2 id="case-demo-title" className="case__h2">
            Try it
          </h2>
          <p className="case__demo-label mono">{c.demoLabel}</p>
        </div>
        <div className="case__demo-frame">
          <Demo slug={slug} />
        </div>
      </section>

      <section className="case__section" aria-labelledby="case-decisions">
        <h2 id="case-decisions" className="case__h2">
          Design decisions
        </h2>
        <ol className="case__decisions">
          {c.decisions.map((d, n) => (
            <li key={d.title} data-reveal style={{ ['--d' as string]: n }}>
              <span className="case__decision-index mono">0{n + 1}</span>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="case__columns">
        <section className="case__section" aria-labelledby="case-interactions">
          <h2 id="case-interactions" className="case__h2 case__h2--small">
            Implemented interactions
          </h2>
          <ul className="case__list">
            {c.interactions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="case__section" aria-labelledby="case-limits">
          <h2 id="case-limits" className="case__h2 case__h2--small">
            Limitations
          </h2>
          <ul className="case__list case__list--limits">
            {c.limitations.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>

      <nav className="case__next" aria-label="More studio concepts">
        <a href={PATHS.case(prev.slug)} className="case__next-link">
          <span className="mono">Previous concept · {prev.index}</span>
          <span className="case__next-title">{prev.title}</span>
        </a>
        <a href="/#work" className="case__next-link case__next-link--center">
          <span className="mono">All work</span>
          <span className="case__next-title">Back to concepts</span>
        </a>
        <a href={PATHS.case(next.slug)} className="case__next-link case__next-link--end">
          <span className="mono">Next concept · {next.index}</span>
          <span className="case__next-title">{next.title}</span>
        </a>
      </nav>
    </article>
  );
}
