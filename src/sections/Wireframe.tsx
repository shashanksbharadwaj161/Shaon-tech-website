import { PREVIEW_H, PREVIEW_REGIONS, PREVIEW_W } from '../lib/previewLayout';

const COLUMNS = 12;

/**
 * The wireframe stage: every interface region as a hairline that draws itself
 * in (`--wire`), over a faint column grid (`--structure`). Driven entirely by
 * CSS custom properties, so it reverses with scroll for free.
 */
export function Wireframe() {
  return (
    <svg className="wire" viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="wire__grid">
        {Array.from({ length: COLUMNS + 1 }, (_, i) => {
          const x = 36 + (i * (784 - 36)) / COLUMNS;
          return <line key={i} x1={x} x2={x} y1={64} y2={600} style={{ ['--o' as string]: i / COLUMNS }} />;
        })}
        {[146, 290, 424, 456, 568].map((y, i) => (
          <line key={`h${i}`} x1={0} x2={PREVIEW_W} y1={y} y2={y} style={{ ['--o' as string]: i / 5 }} />
        ))}
      </g>
      {PREVIEW_REGIONS.map((r) => (
        <rect
          key={r.id}
          className={`wire__rect wire__rect--${r.kind}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={r.r}
          pathLength={1}
          style={{ ['--o' as string]: r.order }}
        />
      ))}
      {PREVIEW_REGIONS.filter((r) => r.kind === 'media').map((r) => (
        <g key={`x-${r.id}`} className="wire__cross" style={{ ['--o' as string]: r.order }}>
          <line x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y + r.h} pathLength={1} />
          <line x1={r.x + r.w} y1={r.y} x2={r.x} y2={r.y + r.h} pathLength={1} />
        </g>
      ))}
    </svg>
  );
}
