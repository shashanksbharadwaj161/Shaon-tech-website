import { useEffect, useRef } from 'react';
import { FoldedMark } from '../brand/FoldedMark';
import { live, subscribeLive } from '../lib/liveState';
import { easeInOutCubic } from '../lib/math';
import { heroPose, mixPose, storyPose } from '../lib/stagePose';
import { useMotion } from '../motion/MotionProvider';
import { SignalLanes } from './SignalLanes';

interface FallbackStageProps {
  mode: 'cinematic' | 'static';
  /** True once WebGL has taken over; the fallback fades out but stays ready. */
  hidden: boolean;
}

/**
 * SVG/CSS rendition of the stage for when WebGL is unavailable, fails, or is
 * still loading. It follows the same pose and story frame as the WebGL scene:
 * the chrome mark drifts from the hero into the story, its two ribbons slide
 * apart along the 21.6° diagonal, and signal lanes take over.
 */
export function FallbackStage({ mode, hidden }: FallbackStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { animate } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let w = el.clientWidth;
    let h = el.clientHeight;
    const update = () => {
      raf = 0;
      if (!w || !h) return;
      const f = live.frame;
      const pose =
        mode === 'static'
          ? heroPose(w, h)
          : mixPose(heroPose(w, h), storyPose(w, h, live.preview), easeInOutCubic(f.hero));
      el.style.setProperty('--sx', pose.x.toFixed(4));
      el.style.setProperty('--sy', pose.y.toFixed(4));
      el.style.setProperty('--sh', pose.h.toFixed(4));
      const pointer = animate && live.pointer.active;
      el.style.setProperty('--px', (pointer ? live.pointer.x : 0).toFixed(3));
      el.style.setProperty('--py', (pointer ? live.pointer.y : 0).toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(() => {
      w = el.clientWidth;
      h = el.clientHeight;
      schedule();
    });
    ro.observe(el);
    const unsubscribe = subscribeLive(schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubscribe();
    };
  }, [mode, animate]);

  return (
    <div ref={ref} className="fallback" data-hidden={hidden ? 'true' : 'false'} aria-hidden="true">
      <div className="fallback__glow" />
      {mode === 'cinematic' && <SignalLanes className="fallback__lanes" />}
      <div className="fallback__mark-wrap">
        <div className="fallback__floor" />
        <FoldedMark variant="chrome" className="fallback__mark" />
      </div>
    </div>
  );
}
