import { useId, type CSSProperties } from 'react';
import { FoldedMark, MARK_ASPECT } from '../brand/FoldedMark';
import { MARK, RIBBON } from '../brand/markGeometry';
import type { SectionId } from '../content/site';

interface MenuSignalProps {
  destination: SectionId;
  selected: boolean;
}

const ANGLE = (Math.atan(RIBBON.params.slope) * 180) / Math.PI;

/** Original destination miniatures, drawn from the studio's shared folded mark.
 * They are decoration inside ordinary navigation links, never extra controls. */
export function MenuSignal({ destination, selected }: MenuSignalProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const metal = `menu-metal-${uid}`;
  const w = MARK_ASPECT * 44;
  const axis = 48 + RIBBON.axisX * MARK.scale * 44;

  return (
    <span
      className={`menu-signal menu-signal--${destination}`}
      data-selected={String(selected)}
      aria-hidden="true"
      style={{ '--signal-angle': `${ANGLE.toFixed(2)}deg`, '--signal-slope': RIBBON.params.slope } as CSSProperties}
    >
      <svg viewBox="0 0 96 72" className="menu-signal__drawing" focusable="false">
        <defs>
          <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F4F7FB" />
            <stop offset="0.42" stopColor="#AAB5C7" />
            <stop offset="0.52" stopColor="#28364D" />
            <stop offset="0.7" stopColor="#F4F7FB" />
            <stop offset="1" stopColor="#326CFF" />
          </linearGradient>
        </defs>

        {destination === 'work' && [0, 1, 2].map((i) => (
          <g
            key={i}
            className="menu-signal__card"
            style={{ '--card-x': (i - 1) * 17, '--card-y': i === 1 ? -3 : 4, '--card-angle': (i - 1) * 13, '--card-i': i } as CSSProperties}
          >
            <rect x="27" y="13" width="42" height="46" rx="5" fill="#0D1424" stroke={`url(#${metal})`} />
            <path d="M32 20H64" className="menu-signal__fine" />
            <FoldedMark x={42} y={25} width={12} height={14} />
            <path d="M33 46H60M33 50H51" className="menu-signal__fine" />
          </g>
        ))}

        {destination === 'services' && (
          <>
            <g className="menu-signal__browser">
              <rect x="13" y="14" width="58" height="42" rx="5" fill="#0D1424" stroke={`url(#${metal})`} />
              <path d="M13 24H71M20 19H28" className="menu-signal__fine" />
              <path d="M20 34H43M20 40H35M20 46H29" className="menu-signal__flow" pathLength={1} />
              <FoldedMark x={50} y={31} width={12} height={14} className="menu-signal__service-mark" />
            </g>
            <g className="menu-signal__phone">
              <rect x="61" y="25" width="23" height="38" rx="5" fill="#0A1020" stroke={`url(#${metal})`} />
              <path d="M68 30H77M68 56H76" className="menu-signal__fine" />
              <FoldedMark x={68} y={37} width={9} height={11} />
            </g>
          </>
        )}

        {destination === 'lab' && (
          <>
            <ellipse className="menu-signal__orbit" cx="48" cy="36" rx="37" ry="22" />
            <ellipse className="menu-signal__orbit menu-signal__orbit--second" cx="48" cy="36" rx="28" ry="32" />
            <g className="menu-signal__lab-mark">
              <FoldedMark variant="chrome" x={48 - w / 2} y={14} width={w} height={44} />
            </g>
            <circle className="menu-signal__spark" cx="81" cy="25" r="2.5" />
          </>
        )}

        {destination === 'studio' && (
          <>
            <g className="menu-signal__construction">
              {[14, 36, 58].map((y) => <path key={y} d={`M10 ${y}H86`} pathLength={1} />)}
              <path d={`M${axis} 7V65M${96 - axis} 7V65`} pathLength={1} />
              <path d={`M10 ${36 + 38 * RIBBON.params.slope}L86 ${36 - 38 * RIBBON.params.slope}`} pathLength={1} />
            </g>
            <FoldedMark x={48 - w / 2} y={14} width={w} height={44} className="menu-signal__studio-mark" />
          </>
        )}

        {destination === 'start' && [0, 1, 2].map((i) => (
          <g
            key={i}
            className="menu-signal__brief-plane"
            style={{ '--plane-x': (i - 1) * 14, '--plane-y': (i - 1) * 7, '--plane-i': i } as CSSProperties}
          >
            <path d="M25 19L66 19L73 26V53H25Z" fill="#0D1424" stroke={`url(#${metal})`} />
            <path d="M66 19V26H73" className="menu-signal__crease" />
            <path d="M33 33H59M33 39H53M33 45H45" className="menu-signal__fine" />
          </g>
        ))}
      </svg>
      <span className="menu-signal__light" />
    </span>
  );
}
