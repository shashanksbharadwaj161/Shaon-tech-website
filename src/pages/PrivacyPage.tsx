import { site, type LinkAction } from '../content/site';
import { CtaLink } from '../ui/CtaLink';

const SECTIONS: { title: string; body: string[]; link?: LinkAction }[] = [
  {
    title: 'What this site stores',
    body: [
      'If you press “Pause motion”, that choice is kept in your browser’s session storage under the key shaon:motion-paused so it survives a reload. It disappears when you close the tab. The site uses no other browser storage for your answers or settings.',
      'There are no cookies, no analytics, no advertising or tracking scripts, and no third-party embeds.',
    ],
  },
  {
    title: 'The project brief',
    body: [
      'Your draft stays in memory during this visit, including when you move between pages. Reloading or closing the tab discards the local draft. Your answers are not sent while you fill it in.',
      'The “Download JSON” and “Download text” buttons create the file inside your browser and ask it to save the file to your device; your browser decides whether it does. No copy is uploaded.',
    ],
  },
  {
    title: 'Sending your brief',
    body: [
      `When you choose “Send brief”, the site transmits your project, goals, budget, timing, name, email and company answers to FormSubmit, which processes them to email ShaOn Tech at ${site.contact.email}.`,
      'A submission confirmation means FormSubmit accepted the request. It does not confirm delivery to the inbox. FormSubmit’s own privacy policy applies to its processing of your answers.',
    ],
    link: { label: 'FormSubmit privacy policy (PDF)', href: 'https://formsubmit.co/privacy.pdf' },
  },
  {
    title: 'Email enquiries',
    body: [
      'ShaOn Tech may retain your enquiry email to respond to your project. For questions about an enquiry or to request deletion, contact the studio using the email below.',
      'Direct email links open your chosen email app. Your email app or provider handles messages you choose to send according to its own settings and policies.',
    ],
    link: { label: site.contact.email, href: site.contact.href },
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
      'Fonts, graphics, the 3D scene and the concept images are served from this site. Sending a brief makes the FormSubmit request described above; direct email links open your email app.',
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
        <p className="doc-page__lead">Your draft stays in this browser until you choose to send it. Submissions use FormSubmit to forward your enquiry to ShaOn Tech.</p>
      </header>
      <div className="doc-page__body">
        {SECTIONS.map((s, i) => (
          <section key={s.title} className="doc-page__section" aria-labelledby={`privacy-${i}`}>
            <h2 id={`privacy-${i}`}>{s.title}</h2>
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.link && (
              <div className="doc-page__actions">
                <CtaLink href={s.link.href} label={s.link.label} variant="line" size="sm" />
              </div>
            )}
          </section>
        ))}
        <p className="doc-page__note mono">This page describes the website’s current behavior.</p>
        <div className="doc-page__actions">
          <CtaLink href="/" label="Back to home" variant="ghost" icon="up" />
        </div>
      </div>
    </article>
  );
}
