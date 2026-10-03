import { useEffect, useRef } from 'react';
import { live, subscribeLive } from '../lib/liveState';
import { useMotion } from '../motion/MotionProvider';

/** QA overlay enabled with ?debug=1: renderer, motion state and live story values. */
export function DebugReadout() {
  const { renderer, rendererReason, reduced, paused } = useMotion();
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const f = live.frame;
      if (ref.current) {
        ref.current.textContent = [
          `renderer  ${renderer} (${rendererReason})`,
          `motion    ${reduced ? 'reduced' : 'full'}${paused ? ' · paused' : ''}`,
          `hero      ${f.hero.toFixed(3)}`,
          `q         ${f.q.toFixed(3)}  ch ${f.activeChapter + 1}`,
          `unfold    ${f.unfold.toFixed(3)}  release ${f.release.toFixed(3)}`,
          `structure ${f.structure.toFixed(3)}  product ${f.product.toFixed(3)}`,
        ].join('\n');
      }
    };
    paint();
    const unsub = subscribeLive(() => {
      if (!raf) raf = requestAnimationFrame(paint);
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [renderer, rendererReason, reduced, paused]);
  return <pre ref={ref} className="debug-readout" aria-hidden="true" />;
}
