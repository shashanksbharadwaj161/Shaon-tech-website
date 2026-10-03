import { CtaLink } from '../ui/CtaLink';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What this site stores',
    body: [
      'If you press “Pause motion”, that choice is kept in your browser’s session storage under the key shaon:motion-paused so it survives a reload. It disappears when you close the tab. Nothing else is written to your device.',
      'There are no cookies, no analytics, no advertising or tracking scripts, and no third-party embeds.',
    ],
  },
  {
    title: 'The project brief',
    body: [
      'Everything you type into the brief stays in this page’s memory. It is not sent anywhere — contact delivery is not connected yet — and it is cleared when you reload or close the page.',
      'The “Download JSON” and “Download text” buttons create the file inside your browser and save it to your device. No copy is uploaded.',
    ],
  },
  {
    title: 'Studio concepts and the Lab',
    body: [
      'The workspace, commerce and stay concepts run entirely in your browser with sample data. Filters, carts and searches are not saved or sent.',
      'The Lab’s settings live only while the page is open.',
    ],
  },
  {
    title: 'What your browser loads',
    body: [
      'Fonts, graphics, the 3D scene and the concept images are served from this site. The site makes no requests to other services.',
      'Your browser’s reduced-motion setting is read only to adjust animation.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <article className="doc-page" aria-labelledby="privacy-title">
      <header className="doc-page__head">
        <p className="eyebrow mono">
          <span className="eyebrow__index">i</span>
          Privacy
        </p>
        <h1 id="privacy-title" className="doc-page__title">
          What happens to your data here.
        </h1>
        <p className="doc-page__lead">In short: almost nothing leaves your browser, and nothing is tracked.</p>
      </header>
      <div className="doc-page__body">
        {SECTIONS.map((s, i) => (
          <section key={s.title} className="doc-page__section" aria-labelledby={`privacy-${i}`}>
            <h2 id={`privacy-${i}`}>{s.title}</h2>
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
        <p className="doc-page__note mono">This page describes the current preview build and will be updated if anything changes.</p>
        <div className="doc-page__actions">
          <CtaLink href="/" label="Back to home" variant="ghost" icon="up" />
        </div>
      </div>
    </article>
  );
}
