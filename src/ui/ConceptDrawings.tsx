import { useId } from 'react';

/**
 * Code-native drawings for the studio concepts. They stand in when the concept
 * renders are unavailable and provide the extra product views in the commerce
 * demo. Ink / silver / cobalt / ice only.
 */

export type LampView = 'front' | 'profile' | 'top';
export type LampFinish = 'polished' | 'brushed';

interface LampDrawingProps {
  view?: LampView;
  finish?: LampFinish;
  /** 1 = standard; larger sizes draw a taller capsule. */
  scale?: number;
  className?: string;
  title?: string;
}

/** The fictional capsule lamp: a vertical capsule above a slim disc base. */
export function LampDrawing({ view = 'front', finish = 'polished', scale = 1, className, title }: LampDrawingProps) {
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  const capH = 120 * scale;
  const capW = 64;
  const cx = 100;
  const baseY = 178;
  const capBottom = baseY - 26;
  const capTop = capBottom - capH;
  const gid = `lamp-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 200 200" className={['drawing drawing--lamp', className].filter(Boolean).join(' ')} {...a11y}>
      <defs>
        <linearGradient id={`${gid}-body`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5B6679" />
          <stop offset="0.22" stopColor={finish === 'polished' ? '#F4F7FB' : '#D5DCE6'} />
          <stop offset="0.48" stopColor={finish === 'polished' ? '#8E9AAE' : '#AAB5C7'} />
          <stop offset="0.72" stopColor={finish === 'polished' ? '#E9EEF6' : '#C5CEDA'} />
          <stop offset="1" stopColor="#326CFF" />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8ACBFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8ACBFF" stopOpacity="0" />
        </radialGradient>
        {finish === 'brushed' && (
          <pattern id={`${gid}-brush`} width="3" height="200" patternUnits="userSpaceOnUse">
            <rect width="1" height="200" fill="#07090D" opacity="0.08" />
          </pattern>
        )}
      </defs>
      <ellipse cx={cx} cy={baseY + 6} rx="70" ry="9" fill={`url(#${gid}-glow)`} />
      {view === 'top' ? (
        <>
          <circle cx={cx} cy={100} r={74} className="drawing__line" />
          <circle cx={cx} cy={100} r={capW / 2} fill={`url(#${gid}-body)`} className="drawing__edge" />
          {finish === 'brushed' && <circle cx={cx} cy={100} r={capW / 2} fill={`url(#${gid}-brush)`} />}
          <circle cx={cx} cy={100} r={8} className="drawing__line" />
          <line x1={cx - 90} x2={cx + 90} y1={100} y2={100} className="drawing__guide" />
          <line x1={cx} x2={cx} y1={10} y2={190} className="drawing__guide" />
        </>
      ) : (
        <>
          <rect x={cx - (view === 'profile' ? 44 : 60)} y={baseY - 6} width={view === 'profile' ? 88 : 120} height={8} rx={4} className="drawing__base" />
          <rect x={cx - 3} y={capBottom} width={6} height={baseY - 6 - capBottom} className="drawing__base" />
          <rect
            x={cx - (view === 'profile' ? capW * 0.42 : capW / 2)}
            y={capTop}
            width={view === 'profile' ? capW * 0.84 : capW}
            height={capH}
            rx={view === 'profile' ? capW * 0.42 : capW / 2}
            fill={`url(#${gid}-body)`}
            className="drawing__edge"
          />
          {finish === 'brushed' && (
            <rect
              x={cx - (view === 'profile' ? capW * 0.42 : capW / 2)}
              y={capTop}
              width={view === 'profile' ? capW * 0.84 : capW}
              height={capH}
              rx={view === 'profile' ? capW * 0.42 : capW / 2}
              fill={`url(#${gid}-brush)`}
            />
          )}
          <line x1={cx - capW / 2 + 6} x2={cx + capW / 2 - 6} y1={capTop + capH * 0.56} y2={capTop + capH * 0.56} className="drawing__seam" />
          <line x1={cx} x2={cx} y1={capTop - 14} y2={baseY + 14} className="drawing__guide" />
        </>
      )}
    </svg>
  );
}

/** A fictional pavilion: a folded roof plane at the mark's 21.6° over a glass volume. */
export function PavilionDrawing({ className, title }: { className?: string; title?: string }) {
  const pid = `pavilion-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  return (
    <svg viewBox="0 0 320 180" className={['drawing drawing--pavilion', className].filter(Boolean).join(' ')} {...a11y}>
      <defs>
        <linearGradient id={`${pid}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#10151F" />
          <stop offset="1" stopColor="#1A2F75" />
        </linearGradient>
        <linearGradient id={`${pid}-glass`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8ACBFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#326CFF" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${pid}-sky)`} />
      <line x1="0" x2="320" y1="136" y2="136" className="drawing__guide" />
      <ellipse cx="170" cy="150" rx="140" ry="10" fill="#326CFF" opacity="0.18" />
      <rect x="92" y="78" width="150" height="58" fill={`url(#${pid}-glass)`} className="drawing__line" />
      {[110, 140, 170, 200, 230].map((x) => (
        <line key={x} x1={x} x2={x} y1="78" y2="136" className="drawing__line" opacity="0.6" />
      ))}
      <path d="M60 86 L270 58 L276 64 L66 92 Z" className="drawing__roof" />
      <path d="M66 92 L276 64 L282 74 L72 102 Z" className="drawing__roof drawing__roof--under" />
      <line x1="250" x2="300" y1="136" y2="116" className="drawing__guide" />
    </svg>
  );
}
