import { site } from '../content/site';
import { OfferingGraphic } from './services/OfferingGraphic';

export function Services() {
  const { services } = site;
  return (
    <section id="services" className="section section--paper services" aria-labelledby="services-title">
      <header className="section__head" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">01</span>
          {services.eyebrow}
        </p>
        <h2 id="services-title" className="section__title">
          {services.title}
        </h2>
        <p className="section__intro">{services.intro}</p>
      </header>

      <div className="offerings">
        {services.offerings.map((o, i) => (
          <article key={o.id} className="offering" aria-labelledby={`offering-${o.id}`} data-reveal style={{ ['--d' as string]: i }}>
            <div className="offering__visual">
              <OfferingGraphic
                kind={o.id}
                label={
                  o.id === 'websites'
                    ? 'The bands of the ShaOn Tech mark unfolding into a website in a browser window'
                    : 'The bands of the ShaOn Tech mark unfolding into an app on a phone'
                }
              />
            </div>
            <p className="offering__index mono">{o.index}</p>
            <h3 id={`offering-${o.id}`} className="offering__title">
              {o.title}
            </h3>
            <p className="offering__lead">{o.lead}</p>
            <p className="offering__body">{o.body}</p>
            <ul className="offering__points">
              {o.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="capabilities" data-reveal>
        <p className="capabilities__label mono">Across both</p>
        <ul className="capabilities__list">
          {services.capabilities.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <section className="approach" aria-labelledby="approach-title" data-reveal>
        <h3 id="approach-title" className="approach__title mono">
          {services.approachTitle}
        </h3>
        <ol className="approach__list">
          {services.approach.map((a, i) => (
            <li key={a.title} className="approach__step">
              <span className="approach__index mono">0{i + 1}</span>
              <span className="approach__name">{a.title}</span>
              <span className="approach__body">{a.body}</span>
            </li>
          ))}
        </ol>
        <a className="approach__link" href={services.approachLink.href}>
          {services.approachLink.label}
          <span aria-hidden="true"> →</span>
        </a>
      </section>
    </section>
  );
}
