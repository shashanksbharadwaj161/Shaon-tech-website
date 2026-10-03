import { useState } from 'react';
import { site } from '../content/site';
import { BriefForm } from '../features/brief/BriefForm';
import { PATHS } from '../router/routes';
import { BriefPlanes } from '../ui/BriefPlanes';

/** /start-project — the full three-step brief. Nothing is sent; the brief can be downloaded. */
export default function StartProjectPage() {
  const { brief } = site;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  return (
    <article className="brief-page" aria-labelledby="brief-title">
      <header className="brief-page__head">
        <p className="eyebrow mono">
          <span className="eyebrow__index">06</span>
          {brief.eyebrow}
        </p>
        <h1 id="brief-title" className="brief-page__title">
          {brief.title}
        </h1>
        <p className="brief-page__intro">{brief.body}</p>
        <p className="brief-page__note mono">
          {brief.deliveryNote} <a href={PATHS.privacy}>How your answers are handled</a>
        </p>
      </header>
      <div className="brief-stage" data-step={step}>
        <BriefPlanes step={step} />
        <div className="brief-stage__card">
          <BriefForm onStepChange={setStep} />
        </div>
      </div>
    </article>
  );
}
