import { useId } from 'react';
import { seeded } from '../lib/previewLayout';

const LANES = Array.from({ length: 11 }, (_, i) => {
  const rand = seeded(100 + i);
  return {
    y: -250 + i * 50 + (rand() - 0.5) * 8,
    dash: `${(2 + rand() * 30).toFixed(1)} ${(14 + rand() * 60).toFixed(1)} ${(1 + rand() * 4).toFixed(1)} ${(20 + rand() * 40).toFixed(1)}`,
    duration: 5 + rand() * 7,
    width: 0.8 + rand() * 1.6,
    opacity: 0.35 + rand() * 0.65,
    ice: rand() > 0.6,
  };
});

/**
 * Signal lanes: eleven dashed streams on the mark's 21.6° diagonal. Used by the
 * SVG fallback during the "signal" chapter and as its static illustration.
 */
export function SignalLanes({ className }: { className?: string }) {
  const fade = `lanes-fade-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className={['lanes', className].filter(Boolean).join(' ')} viewBox="-800 -450 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fade} gradientUnits="userSpaceOnUse" x1={-1000} y1={0} x2={1000} y2={0}>
          <stop offset="0" stopColor="#326CFF" stopOpacity="0" />
          <stop offset="0.3" stopColor="#326CFF" />
          <stop offset="0.7" stopColor="#8ACBFF" />
          <stop offset="1" stopColor="#8ACBFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(-21.6)">
        {LANES.map((lane, i) => (
          <line
            key={i}
            className="lanes__lane"
            x1={-1100}
            x2={1100}
            y1={lane.y}
            y2={lane.y}
            stroke={lane.ice ? '#8ACBFF' : `url(#${fade})`}
            strokeWidth={lane.width}
            strokeDasharray={lane.dash}
            strokeLinecap="round"
            opacity={lane.opacity}
            style={{ animationDuration: `${lane.duration}s`, animationDelay: `${-i * 0.7}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
