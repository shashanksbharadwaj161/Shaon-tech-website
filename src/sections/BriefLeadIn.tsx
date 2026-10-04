import { site } from '../content/site';
import { BriefPlanes } from '../ui/BriefPlanes';
import { CtaLink } from '../ui/CtaLink';
import { MotionText } from '../ui/MotionText';

/** Home chapter leading into the full /start-project brief. */
export function BriefLeadIn() {
  const { brief, contact } = site;
  return (
    <section id="start" className="section section--ink brief-lead" aria-labelledby="start-title">
      <div className="brief-lead__copy" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">06</span>
          {brief.eyebrow}
        </p>
        <h2 id="start-title" className="brief-lead__title">
          <MotionText effect="shine">{brief.title}</MotionText>
        </h2>
        <p className="section__intro">{brief.body}</p>
        <ol className="brief-steps">
          {brief.steps.map((s, i) => (
            <li key={s.index} className="brief-step" style={{ ['--d' as string]: i }}>
              <span className="brief-step__index mono">{s.index}</span>
              <h3 className="brief-step__title">{s.title}</h3>
              <p className="brief-step__body">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="brief-lead__actions">
          <CtaLink href={brief.cta.href} label={brief.cta.label} />
          <a href={contact.href} className="brief-lead__contact">
            <span className="brief-lead__contact-label mono">Contact us</span>
            <span className="brief-lead__email">
              <span>{contact.email}</span><span aria-hidden="true"> ↗</span>
            </span>
          </a>
          <p className="brief-lead__note mono">{contact.deliveryNote}</p>
        </div>
      </div>
      <div className="brief-lead__visual" data-reveal>
        <BriefPlanes step="preview" />
      </div>
    </section>
  );
}
