import { useEffect, useRef } from 'react';
import { site } from '../content/site';
import { useMotion } from '../motion/MotionProvider';

const COLS = 24;
const ROWS = 11;
const BASE = -21.6;

/**
 * A preview of the Lab: a field of short signal strokes resting on the mark's
 * 21.6° angle. They lean towards the pointer (or a slow wandering focus when
 * idle). Decorative only — nothing here requires a pointer.
 */
function SignalField() {
  const ref = useRef<SVGSVGElement>(null);
  const { animate } = useMotion();

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const strokes = Array.from(svg.querySelectorAll<SVGLineElement>('line'));
    const cells = strokes.map((_, i) => ({ x: (i % COLS) + 0.5, y: Math.floor(i / COLS) + 0.5 }));
    let focus = { x: COLS * 0.7, y: ROWS * 0.4 };
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let visible = false;
    let t = 0;

    const draw = () => {
      raf = 0;
      t += 1 / 60;
      const target = pointer ?? { x: COLS * (0.5 + 0.35 * Math.sin(t * 0.23)), y: ROWS * (0.5 + 0.35 * Math.cos(t * 0.31)) };
      focus = { x: focus.x + (target.x - focus.x) * 0.08, y: focus.y + (target.y - focus.y) * 0.08 };
      for (let i = 0; i < strokes.length; i++) {
        const c = cells[i]!;
        const dx = focus.x - c.x;
        const dy = focus.y - c.y;
        const d = Math.hypot(dx, dy);
        const pull = Math.exp(-d / 4.5);
        const angle = BASE + ((Math.atan2(dy, dx) * 180) / Math.PI - BASE) * pull * 0.85;
        const s = strokes[i]!;
        s.style.transform = `rotate(${angle.toFixed(1)}deg) scaleX(${(0.55 + pull * 0.9).toFixed(2)})`;
        s.style.opacity = (0.22 + pull * 0.78).toFixed(2);
      }
      if (animate && visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(svg);
    const move = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      pointer = { x: ((e.clientX - r.left) / r.width) * COLS, y: ((e.clientY - r.top) / r.height) * ROWS };
      if (!animate && !raf) raf = requestAnimationFrame(draw);
    };
    const leave = () => {
      pointer = null;
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
    };
  }, [animate]);

  return (
    <svg ref={ref} className="field" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const x = (i % COLS) + 0.5;
        const y = Math.floor(i / COLS) + 0.5;
        return <line key={i} x1={x - 0.36} x2={x + 0.36} y1={y} y2={y} style={{ transformOrigin: `${x}px ${y}px` }} />;
      })}
    </svg>
  );
}

export function Lab() {
  const { lab } = site;
  return (
    <section id="lab" className="section section--ink lab" aria-labelledby="lab-title">
      <div className="lab__copy" data-reveal>
        <p className="eyebrow mono">
          <span className="eyebrow__index">03</span>
          {lab.eyebrow}
        </p>
        <h2 id="lab-title" className="section__title">
          {lab.title}
        </h2>
        <p className="section__intro">{lab.body}</p>
        <p className="lab__note mono">
          <span className="concept__pulse" aria-hidden="true" />
          {lab.note}
        </p>
      </div>
      <div className="lab__field" data-reveal>
        <SignalField />
        <p className="lab__hint mono" aria-hidden="true">
          {lab.hint}
        </p>
      </div>
    </section>
  );
}
