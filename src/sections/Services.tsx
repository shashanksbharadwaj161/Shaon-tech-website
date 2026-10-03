import { site } from '../content/site';

const GLYPHS = [
  // Design: a page and its structure.
  'M6 6h44v36H6zM6 16h44M14 24h18M14 30h26',
  // Develop: code brackets.
  'M18 12 6 24l12 12M38 12l12 12-12 12M32 8 24 40',
  // Launch: the mark's 21.6° diagonal rising through a baseline.
  'M6 42h44M10 36 46 10M36 10h10v10',
];

export function Services() {
  const { services } = site;
  return (
    <section id="services" className="section section--paper services" aria-labelledby="services-title">
      <div className="services__aside" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">02</span>
          {services.eyebrow}
        </p>
        <h2 id="services-title" className="section__title">
          {services.title}
        </h2>
        <p className="section__intro">{services.intro}</p>
      </div>
      <ol className="services__list">
        {services.items.map((s, i) => (
          <li key={s.index} className="service" data-reveal style={{ ['--d' as string]: i }}>
            <svg viewBox="0 0 56 48" className="service__glyph" aria-hidden="true" focusable="false">
              <path d={GLYPHS[i]} pathLength={1} />
            </svg>
            <p className="service__index mono">{s.index}</p>
            <h3 className="service__title">{s.title}</h3>
            <p className="service__body">{s.body}</p>
            <ul className="service__tags">
              {s.includes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
