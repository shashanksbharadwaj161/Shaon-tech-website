import { useId, type CSSProperties } from 'react';
import { MARK, pieceToPath } from './markGeometry';

const SIZE = 100;
const WIDTH = MARK.width * SIZE;
export const MARK_VIEWBOX = `0 0 ${WIDTH.toFixed(2)} ${SIZE}`;
export const MARK_ASPECT = MARK.width;

type PieceId = (typeof MARK.pieces)[number]['id'];
const PATHS = Object.fromEntries(MARK.pieces.map((p) => [p.id, pieceToPath(p.points, SIZE, MARK.width)])) as Record<
  PieceId,
  string
>;
const RIBBONS = [
  { key: 'upper', back: PATHS['upper-back'], front: PATHS['upper-front'] },
  { key: 'lower', back: PATHS['lower-back'], front: PATHS['lower-front'] },
] as const;

/** Path data for each piece of the mark in a 0..WIDTH × 0..100 box (for favicons, tests, etc). */
export const MARK_PATHS = PATHS;

export interface FoldedMarkProps {
  /** `flat`: single colour (currentColor) with a transparent crease. `chrome`: rendered metal. */
  variant?: 'flat' | 'chrome';
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Omit for decorative use (aria-hidden). */
  title?: string;
  /** Crease width relative to the 100-unit mark height. Thicker for tiny sizes. */
  crease?: number;
  /** Placement when nested inside another SVG (user units of the parent). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * The Folded Signal mark: two ribbons, each folded once. The crease where a
 * ribbon's front band crosses its own back band is cut out with a mask (not
 * painted), so the flat logo works on any background. Each ribbon is its own
 * group (`.mark__ribbon--upper/--lower`) so motion can separate them.
 */
export function FoldedMark({ variant = 'flat', className, style, title, crease = 1.6, x, y, width, height }: FoldedMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  const chrome = variant === 'chrome';

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      x={x}
      y={y}
      width={width}
      height={height}
      className={['mark', chrome ? 'mark--chrome' : 'mark--flat', className].filter(Boolean).join(' ')}
      style={style}
      focusable="false"
      overflow="visible"
      {...a11y}
    >
      <defs>
        {RIBBONS.map((r) => (
          <mask key={r.key} id={id(`crease-${r.key}`)} maskUnits="userSpaceOnUse" x={-10} y={-10} width={WIDTH + 20} height={SIZE + 20}>
            <rect x={-10} y={-10} width={WIDTH + 20} height={SIZE + 20} fill="#fff" />
            <path d={r.front} fill="#000" stroke="#000" strokeWidth={crease * 2} strokeLinejoin="round" />
          </mask>
        ))}
        {chrome && (
          <>
            <linearGradient id={id('front')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.24" stopColor="#CDD5E2" />
              <stop offset="0.44" stopColor="#566175" />
              <stop offset="0.58" stopColor="#EEF2F8" />
              <stop offset="0.8" stopColor="#8F9BAF" />
              <stop offset="1" stopColor="#2C5BE6" />
            </linearGradient>
            <linearGradient id={id('back')} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#DCE3EE" />
              <stop offset="0.34" stopColor="#6B778B" />
              <stop offset="0.56" stopColor="#232C3D" />
              <stop offset="0.82" stopColor="#9AA6B9" />
              <stop offset="1" stopColor="#326CFF" />
            </linearGradient>
            <linearGradient id={id('edge')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8ACBFF" />
              <stop offset="0.5" stopColor="#326CFF" />
              <stop offset="1" stopColor="#8ACBFF" />
            </linearGradient>
            <linearGradient id={id('sweep')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </>
        )}
      </defs>
      {RIBBONS.map((r) => (
        <g key={r.key} className={`mark__ribbon mark__ribbon--${r.key}`}>
          {chrome && (
            <clipPath id={id(`clip-${r.key}`)}>
              <path d={r.back} />
              <path d={r.front} />
            </clipPath>
          )}
          <path
            className="mark__back"
            d={r.back}
            mask={`url(#${id(`crease-${r.key}`)})`}
            fill={chrome ? `url(#${id('back')})` : 'currentColor'}
            stroke={chrome ? `url(#${id('edge')})` : undefined}
            strokeWidth={chrome ? 0.7 : undefined}
          />
          <path
            className="mark__front"
            d={r.front}
            fill={chrome ? `url(#${id('front')})` : 'currentColor'}
            stroke={chrome ? `url(#${id('edge')})` : undefined}
            strokeWidth={chrome ? 0.7 : undefined}
          />
          {chrome && (
            <g clipPath={`url(#${id(`clip-${r.key}`)})`}>
              <rect className="mark__sweep" x={-40} y={-20} width={34} height={SIZE + 40} fill={`url(#${id('sweep')})`} />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
