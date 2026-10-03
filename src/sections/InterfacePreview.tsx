import type { CSSProperties, ReactNode } from 'react';
import { FoldedMark } from '../brand/FoldedMark';
import { PREVIEW_REGIONS, regionBox, type PreviewRegion } from '../lib/previewLayout';

const style = (r: PreviewRegion): CSSProperties => ({ ...regionBox(r), ['--o' as string]: r.order, borderRadius: `${(r.r / 10).toFixed(2)}cqw` });

function Lines({ n, widths }: { n: number; widths?: number[] }) {
  return (
    <span className="ui-lines">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: `${widths?.[i] ?? 100}%` }} />
      ))}
    </span>
  );
}

const CONTENT: Record<string, ReactNode> = {
  'browser-bar': (
    <>
      <span className="ui-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="ui-url">studio-concept / preview</span>
    </>
  ),
  nav: (
    <>
      <span className="ui-brand">
        <FoldedMark className="ui-brand__mark" />
        Your product
      </span>
      <span className="ui-links">
        <span>Overview</span>
        <span>Features</span>
        <span>Support</span>
      </span>
      <span className="ui-pill">Get started</span>
    </>
  ),
  title: (
    <span className="ui-title">
      Your idea,
      <br />
      <em>live.</em>
    </span>
  ),
  text: <span className="ui-text">A fast, accessible product — designed and built to grow with you.</span>,
  'cta-a': <span className="ui-btn ui-btn--solid">Get started</span>,
  'cta-b': <span className="ui-btn">How it works</span>,
  media: (
    <span className="ui-media">
      <span className="ui-media__lanes" />
      <FoldedMark variant="chrome" className="ui-media__mark" />
    </span>
  ),
  'card-a': (
    <span className="ui-card">
      <span className="ui-card__icon ui-card__icon--a" />
      <b>Bookings</b>
      <Lines n={2} widths={[90, 60]} />
    </span>
  ),
  'card-b': (
    <span className="ui-card">
      <span className="ui-card__icon ui-card__icon--b" />
      <b>Payments</b>
      <Lines n={2} widths={[80, 70]} />
    </span>
  ),
  'card-c': (
    <span className="ui-card">
      <span className="ui-card__icon ui-card__icon--c" />
      <b>Insights</b>
      <Lines n={2} widths={[85, 50]} />
    </span>
  ),
  'phone-head': (
    <>
      <FoldedMark className="ui-brand__mark" />
      <span className="ui-phone-time">9:41</span>
    </>
  ),
  'phone-media': (
    <span className="ui-phone-card">
      <span className="mono-tiny">Today</span>
      <b>Launch day</b>
      <span className="ui-phone-card__bar" />
    </span>
  ),
  'phone-row-a': (
    <span className="ui-row">
      <i className="ok" />
      Brief received
    </span>
  ),
  'phone-row-b': (
    <span className="ui-row">
      <i className="ok" />
      Design reviewed
    </span>
  ),
  'phone-row-c': (
    <span className="ui-row">
      <i />
      Ready to launch
    </span>
  ),
  'phone-tab': (
    <span className="ui-tabs">
      <i className="on" />
      <i />
      <i />
      <i />
    </span>
  ),
};

/**
 * The "living product" the story resolves into: a website and its app
 * companion, laid out on the same regions the wireframe and particles use.
 * Purely illustrative — a studio concept, not client work.
 */
export function InterfacePreview() {
  return (
    <div className="ui" aria-hidden="true">
      {PREVIEW_REGIONS.map((r) => (
        <div key={r.id} className={`ui-region ui-region--${r.kind} ui-${r.id}`} style={style(r)}>
          {CONTENT[r.id] ?? null}
        </div>
      ))}
    </div>
  );
}
