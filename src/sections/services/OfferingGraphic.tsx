import { useCallback, useRef } from 'react';
import { FoldedMark, MARK_ASPECT } from '../../brand/FoldedMark';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { smoothstep } from '../../lib/math';
import { markBandQuads, mixQuad, planeProgress, quadPoints, rectQuad, toSvg, type Quad } from '../../lib/planeMorph';
import { useMotion } from '../../motion/MotionProvider';

const CX = 200;
const CY = 150;
const SIZE = 210;
const BANDS = markBandQuads().map((q) => toSvg(q, CX, CY, SIZE));

type Kind = 'websites' | 'apps';

const TARGETS: Record<Kind, Quad[]> = {
  websites: [rectQuad(46, 42, 308, 28), rectQuad(46, 80, 190, 118), rectQuad(246, 80, 108, 118), rectQuad(46, 208, 308, 50)],
  apps: [rectQuad(148, 36, 104, 26), rectQuad(148, 70, 104, 108), rectQuad(148, 186, 104, 52), rectQuad(148, 246, 104, 22)],
};

const FRAMES: Record<Kind, { x: number; y: number; w: number; h: number; r: number }> = {
  websites: { x: 36, y: 32, w: 328, h: 236, r: 14 },
  apps: { x: 138, y: 22, w: 124, h: 258, r: 22 },
};

/** Final fills for each plane (ink → interface colour). */
const END_FILLS: Record<Kind, string[]> = {
  websites: ['#171E2C', '#2C60F2', '#10151F', '#171E2C'],
  apps: ['#171E2C', '#2C60F2', '#171E2C', '#171E2C'],
};

function Details({ kind }: { kind: Kind }) {
  if (kind === 'websites') {
    return (
      <>
        {[60, 72, 84].map((x) => (
          <circle key={x} cx={x} cy={56} r={3.2} className="og__dot" />
        ))}
        <rect x={150} y={50} width={110} height={12} rx={6} className="og__pill" />
        <rect x={62} y={98} width={120} height={14} rx={3} className="og__text og__text--strong" />
        <rect x={62} y={118} width={88} height={14} rx={3} className="og__text og__text--strong" />
        <rect x={62} y={142} width={140} height={5} rx={2.5} className="og__text" />
        <rect x={62} y={152} width={110} height={5} rx={2.5} className="og__text" />
        <rect x={62} y={170} width={64} height={18} rx={9} className="og__button" />
        <FoldedMark x={268} y={104} width={MARK_ASPECT * 70} height={70} className="og__mini-mark" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={58 + i * 100} y={220} width={88} height={26} rx={5} className="og__card" />
            <rect x={66 + i * 100} y={228} width={40} height={4} rx={2} className="og__text" />
            <rect x={66 + i * 100} y={236} width={60} height={4} rx={2} className="og__text og__text--dim" />
          </g>
        ))}
      </>
    );
  }
  return (
    <>
      <FoldedMark x={158} y={41} width={MARK_ASPECT * 16} height={16} className="og__mini-mark" />
      <rect x={222} y={46} width={20} height={6} rx={3} className="og__text og__text--dim" />
      <rect x={160} y={140} width={56} height={10} rx={2} className="og__text og__text--strong" />
      <rect x={160} y={156} width={80} height={5} rx={2.5} className="og__text" />
      <rect x={160} y={166} width={80} height={4} rx={2} className="og__track" />
      <rect x={160} y={166} width={54} height={4} rx={2} className="og__progress" />
      {[0, 1].map((i) => (
        <g key={i}>
          <circle cx={164} cy={200 + i * 22} r={4} className="og__dot og__dot--on" />
          <rect x={174} y={197 + i * 22} width={64} height={5} rx={2.5} className="og__text" />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={164 + i * 22} y={252} width={8} height={8} rx={2} className={`og__tab${i === 0 ? ' og__tab--on' : ''}`} />
      ))}
    </>
  );
}

/**
 * The four straight bands of the Folded Signal unfold, corner by corner, into
 * a browser window (Websites) or a phone (Apps), then interface detail appears
 * inside the planes. Scroll-linked and reversible; still and complete when
 * motion is reduced.
 */
export function OfferingGraphic({ kind, label }: { kind: Kind; label: string }) {
  const { reduced } = useMotion();
  const root = useRef<SVGSVGElement>(null);
  const planes = useRef<(SVGPolygonElement | null)[]>([]);
  const targets = TARGETS[kind];
  const frame = FRAMES[kind];
  const lag = kind === 'apps' ? 0.06 : 0;

  const apply = useCallback(
    (raw: number) => {
      const svg = root.current;
      if (!svg) return;
      const t = Math.max(0, Math.min(1, (raw - lag) / (1 - lag)));
      BANDS.forEach((band, i) => {
        const p = planeProgress(smoothstep(0.08, 0.86, t), i, BANDS.length, 0.62);
        const poly = planes.current[i];
        if (!poly) return;
        poly.setAttribute('points', quadPoints(mixQuad(band, targets[i]!, p)));
        poly.style.setProperty('--p', p.toFixed(3));
      });
      svg.style.setProperty('--t', t.toFixed(3));
      svg.style.setProperty('--mark', (1 - smoothstep(0.02, 0.16, t)).toFixed(3));
      svg.style.setProperty('--frame', smoothstep(0.5, 0.9, t).toFixed(3));
      svg.style.setProperty('--ui', smoothstep(0.78, 0.98, t).toFixed(3));
    },
    [lag, targets],
  );

  useScrollProgress(root, apply, { kind: 'enter', start: 0.98, end: 0.32 }, reduced);

  const ink = '#07090D';
  return (
    <svg ref={root} viewBox="0 0 400 300" className={`og og--${kind}`} role="img" aria-label={label}>
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.w}
        height={frame.h}
        rx={frame.r}
        pathLength={1}
        className="og__frame"
      />
      {BANDS.map((band, i) => (
        <polygon
          key={i}
          ref={(el) => {
            planes.current[i] = el;
          }}
          points={quadPoints(band)}
          className="og__plane"
          style={{ ['--from' as string]: ink, ['--to' as string]: END_FILLS[kind][i] }}
        />
      ))}
      <g className="og__mark">
        <FoldedMark x={CX - (MARK_ASPECT * SIZE) / 2} y={CY - SIZE / 2} width={MARK_ASPECT * SIZE} height={SIZE} />
      </g>
      <g className="og__ui">
        <Details kind={kind} />
      </g>
    </svg>
  );
}
