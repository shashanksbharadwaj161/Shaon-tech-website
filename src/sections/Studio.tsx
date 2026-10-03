import { FoldedMark, MARK_ASPECT } from '../brand/FoldedMark';
import { MARK, RIBBON } from '../brand/markGeometry';
import { site } from '../content/site';

const W = MARK_ASPECT * 100;
const S = MARK.scale * 100;
const ANGLE = (Math.atan(RIBBON.params.slope) * 180) / Math.PI;

/** The mark with its construction: crease axes, fold cylinders and the shared band angle. */
function Construction() {
  const axis = W / 2 + RIBBON.axisX * S;
  const r = RIBBON.params.foldRadius * S;
  const slope = RIBBON.params.slope;
  // Top edge of the upper back band, extended across the drawing (SVG y is down).
  const y = (x: number) => 50 - RIBBON.backTop * S - slope * (x - axis);
  return (
    <svg viewBox={`-20 -14 ${W + 40} 128`} className="construction" aria-hidden="true" focusable="false">
      <g className="construction__grid">
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={`h${v}`} x1={-20} x2={W + 20} y1={v} y2={v} />
        ))}
      </g>
      <g className="construction__lines">
        <line x1={axis} x2={axis} y1={-12} y2={112} pathLength={1} />
        <line x1={W - axis} x2={W - axis} y1={-12} y2={112} pathLength={1} />
        <rect x={axis - r} y={-12} width={r} height={124} className="construction__cyl" />
        <rect x={W - axis} y={-12} width={r} height={124} className="construction__cyl" />
        <line x1={-20} y1={y(-20)} x2={W + 20} y2={y(W + 20)} pathLength={1} />
        <line x1={-20} y1={100 - y(W + 20)} x2={W + 20} y2={100 - y(-20)} pathLength={1} />
      </g>
      <FoldedMark className="construction__mark" x={0} y={0} width={W} height={100} />
      <text x={W + 18} y={-4} textAnchor="end" className="construction__label">
        {ANGLE.toFixed(1)}°
      </text>
      <text x={W + 18} y={110} textAnchor="end" className="construction__label">
        A / Folded Signal
      </text>
    </svg>
  );
}

export function Studio() {
  const { studio } = site;
  return (
    <section id="studio" className="section section--paper studio" aria-labelledby="studio-title">
      <div className="studio__copy" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">04</span>
          {studio.eyebrow}
        </p>
        <h2 id="studio-title" className="section__title">
          {studio.title}
        </h2>
        {studio.paragraphs.map((p) => (
          <p key={p} className="section__intro">
            {p}
          </p>
        ))}
        <dl className="facts">
          {studio.facts.map((f) => (
            <div key={f.label} className="facts__row">
              <dt className="mono">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figure className="studio__figure" data-reveal>
        <Construction />
        <figcaption className="mono">
          The mark: two ribbons, each folded once around a vertical crease. Every band runs at the same {ANGLE.toFixed(1)}° angle.
        </figcaption>
      </figure>
    </section>
  );
}
