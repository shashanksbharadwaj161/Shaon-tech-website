import { useMotion } from '../motion/MotionProvider';

/**
 * Always-visible control for autonomous motion. Scroll-linked changes still
 * follow the visitor's own scrolling while paused; only self-running motion
 * (idle drift, particle flow, shimmer) stops.
 */
export function MotionToggle() {
  const { paused, togglePaused, reduced } = useMotion();
  if (reduced) {
    return (
      <p className="motion-toggle motion-toggle--status mono" role="status">
        <span className="motion-toggle__dot" aria-hidden="true" />
        Reduced motion
      </p>
    );
  }
  return (
    <button type="button" className="motion-toggle mono" onClick={togglePaused} data-paused={paused ? 'true' : 'false'}>
      <span className="motion-toggle__glyph" aria-hidden="true">
        {paused ? (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" />
          </svg>
        )}
      </span>
      <span className="motion-toggle__label">{paused ? 'Resume motion' : 'Pause motion'}</span>
    </button>
  );
}
