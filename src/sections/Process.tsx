import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { FoldedMark } from '../brand/FoldedMark';
import { site } from '../content/site';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { processDrivers, type ProcessDrivers } from '../lib/processTimeline';
import { useMotion } from '../motion/MotionProvider';

const W = 800;
const H = 480;
const SLOPE = 0.396;
const ROWS = [96, 168, 240, 312, 384];
const COLS = Array.from({ length: 7 }, (_, i) => 80 + i * (640 / 6));

const varsFor = (d: ProcessDrivers): CSSProperties =>
  ({
    '--discover': d.discover,
    '--design': d.design,
    '--develop': d.develop,
    '--launch': d.launch,
  }) as CSSProperties;

/** Interface regions in the 800×480 space (percent-positioned HTML over the SVG grid). */
const UI = [
  { id: 'nav', x: 80, y: 96, w: 640, h: 48, o: 0 },
  { id: 'title', x: 80, y: 168, w: 320, h: 120, o: 0.15 },
  { id: 'visual', x: 400 + 13, y: 168, w: 307, h: 192, o: 0.3 },
  { id: 'action', x: 80, y: 312, w: 320, h: 48, o: 0.42 },
  { id: 'cards', x: 80, y: 384, w: 640, h: 0, o: 0.55 },
];
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

function ProcessCanvas({ style, interactive }: { style?: CSSProperties; interactive: boolean }) {
  const [theme, setTheme] = useState<'ink' | 'paper'>('ink');
  const x0 = 80;
  const x1 = 720;
  const yMid = 240;
  const lineY = (x: number) => yMid + SLOPE * (W / 2 - x);
  return (
    <div className="pc" style={style}>
      <svg className="pc__svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        {/* Discover: one line of thought at the mark's angle */}
        <line className="pc__thought" x1={x0} y1={lineY(x0)} x2={x1} y2={lineY(x1)} pathLength={1} />
        <circle className="pc__node" cx={x1} cy={lineY(x1)} r={5} />
        {/* Design: the line opens into rows and columns */}
        {ROWS.map((y, i) => (
          <line
            key={`r${y}`}
            className="pc__row"
            x1={x0}
            y1={y}
            x2={x1}
            y2={y}
            style={{ ['--dy' as string]: yMid - y, transformOrigin: `${W / 2}px ${y}px`, ['--k' as string]: i / (ROWS.length - 1) } as CSSProperties}
          />
        ))}
        {COLS.map((x, i) => (
          <line
            key={`c${x}`}
            className="pc__col"
            x1={x}
            y1={64}
            x2={x}
            y2={416}
            style={{ transformOrigin: `${x}px ${yMid}px`, ['--k' as string]: i / (COLS.length - 1) } as CSSProperties}
          />
        ))}
        {/* Launch: the finished frame closes around the work */}
        <rect className="pc__frame" x={56} y={60} width={688} height={372} rx={22} pathLength={1} />
      </svg>

      <div className={`pc__ui pc__ui--${theme}`} inert={!interactive}>
        {UI.map((r) => (
          <div
            key={r.id}
            className={`pc__cell pc__cell--${r.id}`}
            style={
              {
                left: pct(r.x, W),
                top: pct(r.y, H),
                width: pct(r.w, W),
                height: r.h ? pct(r.h, H) : undefined,
                '--o': r.o,
              } as CSSProperties
            }
          >
            {r.id === 'nav' && (
              <>
                <FoldedMark className="pc__logo" />
                <span className="pc__navlinks" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </>
            )}
            {r.id === 'title' && (
              <p className="pc__title">
                Clear,
                <br />
                <em>usable</em>, live.
              </p>
            )}
            {r.id === 'visual' && <FoldedMark variant="chrome" className="pc__visual-mark" />}
            {r.id === 'action' && (
              <div className="pc__toggle" role="group" aria-label="Preview theme (working control)">
                <button type="button" aria-pressed={theme === 'ink'} onClick={() => setTheme('ink')}>
                  Ink
                </button>
                <button type="button" aria-pressed={theme === 'paper'} onClick={() => setTheme('paper')}>
                  Paper
                </button>
              </div>
            )}
            {r.id === 'cards' && (
              <div className="pc__cards" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        ))}
        <span className="pc__live mono" aria-hidden="true">
          <span className="pc__live-dot" />
          Live
        </span>
      </div>
    </div>
  );
}

/**
 * Discover → Design → Develop → Launch. A single line of thought opens into a
 * grid, becomes a working interface and settles into a finished frame. Pinned
 * with native sticky and scroll-linked, so it reverses naturally. With reduced
 * motion the four states are shown side by side.
 */
export function Process() {
  const { process } = site;
  const { reduced } = useMotion();
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);
  const lastStage = useRef(-1);
  const lastInteractive = useRef(false);

  const apply = useCallback((p: number) => {
    const el = pin.current;
    if (!el) return;
    const d = processDrivers(p);
    el.style.setProperty('--p', p.toFixed(4));
    el.style.setProperty('--discover', d.discover.toFixed(4));
    el.style.setProperty('--design', d.design.toFixed(4));
    el.style.setProperty('--develop', d.develop.toFixed(4));
    el.style.setProperty('--launch', d.launch.toFixed(4));
    if (d.stage !== lastStage.current) {
      lastStage.current = d.stage;
      el.dataset.stage = String(d.stage);
      el.querySelectorAll<HTMLElement>('[data-stage-i]').forEach((s) => {
        const i = Number(s.dataset.stageI);
        s.dataset.state = i < d.stage ? 'before' : i > d.stage ? 'after' : 'active';
      });
    }
    // Only let keyboard users reach the working control once it is on screen.
    const nextInteractive = d.develop > 0.85;
    if (nextInteractive !== lastInteractive.current) {
      lastInteractive.current = nextInteractive;
      setInteractive(nextInteractive);
    }
  }, []);

  useScrollProgress(section, apply, { kind: 'pinned' }, false);

  if (reduced) {
    const states: ProcessDrivers[] = [
      { discover: 1, design: 0, develop: 0, launch: 0 },
      { discover: 1, design: 1, develop: 0, launch: 0 },
      { discover: 1, design: 1, develop: 1, launch: 0 },
      { discover: 1, design: 1, develop: 1, launch: 1 },
    ];
    return (
      <section id="process" className="section section--ink process process--still" aria-labelledby="process-title">
        <header className="section__head">
          <p className="eyebrow mono">
            <span className="eyebrow__index">04</span>
            {process.eyebrow}
          </p>
          <h2 id="process-title" className="section__title">
            {process.title}
          </h2>
        </header>
        <ol className="process-still">
          {process.stages.map((s, i) => (
            <li key={s.id} className="process-still__item">
              <ProcessCanvas style={varsFor(states[i]!)} interactive={i === 3} />
              <p className="process__index mono">{s.index}</p>
              <h3 className="process__name">{s.title}</h3>
              <p className="process__body">{s.body}</p>
              <p className="process__detail mono">{s.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section id="process" ref={section} className="process" aria-labelledby="process-title">
      <div className="process__pin" ref={pin} data-stage="0">
        <header className="process__head">
          <p className="eyebrow mono">
            <span className="eyebrow__index">04</span>
            {process.eyebrow}
          </p>
          <h2 id="process-title" className="process__title">
            {process.title}
          </h2>
        </header>

        <ol className="process__rail" aria-hidden="true">
          {process.stages.map((s, i) => (
            <li key={s.id} className="process__rail-step" data-i={i}>
              <span className="mono">{s.index}</span>
              {s.title}
            </li>
          ))}
          <li className="process__rail-line">
            <span />
          </li>
        </ol>

        <ol className="process__copy">
          {process.stages.map((s, i) => (
            <li key={s.id} className="swap" data-stage-i={i} data-state={i === 0 ? 'active' : 'after'}>
              <article aria-labelledby={`process-${s.id}`}>
                <p className="process__index mono">
                  {s.index} <span aria-hidden="true">/ 04</span>
                </p>
                <h3 id={`process-${s.id}`} className="process__name">
                  {s.title}
                </h3>
                <p className="process__body">{s.body}</p>
                <p className="process__detail mono">{s.detail}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="process__stage">
          <ProcessCanvas interactive={interactive} />
        </div>
      </div>
    </section>
  );
}
