import { site } from '../content/site';

/** Small looping diagrams that hint at what each concept explores. */
function ConceptGlyph({ index }: { index: number }) {
  if (index === 0) {
    // Dashboard: bars re-sorting as a filter is applied.
    return (
      <svg viewBox="0 0 120 72" className="glyph glyph--filter" aria-hidden="true" focusable="false">
        <rect x="4" y="6" width="34" height="6" rx="3" className="glyph__chip glyph__chip--on" />
        <rect x="42" y="6" width="26" height="6" rx="3" className="glyph__chip" />
        <rect x="72" y="6" width="30" height="6" rx="3" className="glyph__chip" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={6 + i * 18} y="22" width="10" height="44" className="glyph__bar" style={{ ['--i' as string]: i }} />
        ))}
      </svg>
    );
  }
  if (index === 1) {
    // Commerce: selection ring moving across variants, cart badge ticking.
    return (
      <svg viewBox="0 0 120 72" className="glyph glyph--variant" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={16 + i * 22} cy="26" r="7" className="glyph__swatch" style={{ ['--i' as string]: i }} />
        ))}
        <circle cx="16" cy="26" r="11" className="glyph__ring" />
        <rect x="6" y="48" width="76" height="16" rx="8" className="glyph__chip glyph__chip--on" />
        <path d="M96 44h16l-3 14H99z" className="glyph__cart" />
        <circle cx="111" cy="42" r="5" className="glyph__badge" />
      </svg>
    );
  }
  // Hospitality: a date range sweeping across a month grid.
  return (
    <svg viewBox="0 0 120 72" className="glyph glyph--range" aria-hidden="true" focusable="false">
      {Array.from({ length: 21 }, (_, i) => (
        <rect key={i} x={6 + (i % 7) * 16} y={8 + Math.floor(i / 7) * 20} width="12" height="14" rx="2" className="glyph__day" style={{ ['--i' as string]: i }} />
      ))}
      <rect x="22" y="26" width="60" height="18" rx="9" className="glyph__range" />
    </svg>
  );
}

export function Work() {
  const { work } = site;
  return (
    <section id="work" className="section section--ink work" aria-labelledby="work-title">
      <div className="section__head" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">01</span>
          {work.eyebrow}
        </p>
        <h2 id="work-title" className="section__title">
          {work.title}
        </h2>
        <p className="section__intro">{work.intro}</p>
      </div>
      <ol className="concepts">
        {work.concepts.map((c, i) => (
          <li key={c.index} className="concept" data-reveal data-live style={{ ['--d' as string]: i }}>
            <span className="concept__index mono">{c.index}</span>
            <div className="concept__main">
              <h3 className="concept__title">{c.title}</h3>
              <p className="concept__kind mono">
                {c.kind} <span aria-hidden="true">·</span> Studio concept
              </p>
            </div>
            <p className="concept__summary">{c.summary}</p>
            <ul className="concept__explores" aria-label="Explores">
              {c.explores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <div className="concept__glyph">
              <ConceptGlyph index={i} />
            </div>
            <p className="concept__status mono">
              <span className="concept__pulse" aria-hidden="true" />
              {c.status}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
