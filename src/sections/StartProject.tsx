import { site } from '../content/site';

export function StartProject() {
  const { start } = site;
  return (
    <section id="start" className="section section--ink start" aria-labelledby="start-title">
      <div className="start__head" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">05</span>
          {start.eyebrow}
        </p>
        <h2 id="start-title" className="start__title">
          {start.title}
        </h2>
        <p className="section__intro">{start.body}</p>
      </div>
      <ol className="brief-steps" data-reveal>
        {start.steps.map((s, i) => (
          <li key={s.index} className="brief-step" style={{ ['--d' as string]: i }}>
            <span className="brief-step__index mono">{s.index}</span>
            <h3 className="brief-step__title">{s.title}</h3>
            <p className="brief-step__body">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="start__status mono" data-reveal>
        <span className="concept__pulse" aria-hidden="true" />
        {start.status}
      </p>
    </section>
  );
}
