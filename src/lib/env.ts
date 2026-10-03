/**
 * Runtime switches and capability checks.
 *
 * QA query switches (combine freely):
 *   ?fallback=1            force the SVG/CSS fallback instead of WebGL
 *   ?renderer=fallback     same as above
 *   ?renderer=webgl        skip the up-front capability probe and try WebGL anyway
 *   ?motion=reduce         behave exactly as if prefers-reduced-motion: reduce were set
 *   ?motion=full           ignore an OS reduced-motion preference (for comparison only)
 *   ?debug=1               show a small live readout of renderer / progress state
 *
 * The same switches are read by the inline boot script in index.html so the
 * first paint already matches.
 */

export type RendererPreference = 'auto' | 'fallback' | 'webgl';
export type MotionOverride = 'system' | 'reduce' | 'full';
export type RendererMode = 'webgl' | 'fallback';

export interface QuerySwitches {
  renderer: RendererPreference;
  motion: MotionOverride;
  debug: boolean;
}

const truthy = (v: string | null): boolean => v !== null && v !== '0' && v.toLowerCase() !== 'false';

export function parseQuerySwitches(search: string): QuerySwitches {
  const params = new URLSearchParams(search);
  let renderer: RendererPreference = 'auto';
  const r = params.get('renderer')?.toLowerCase();
  if (r === 'fallback' || r === 'svg' || r === 'static') renderer = 'fallback';
  else if (r === 'webgl' || r === 'gl') renderer = 'webgl';
  if (truthy(params.get('fallback')) || params.get('webgl') === '0') renderer = 'fallback';

  let motion: MotionOverride = 'system';
  const m = (params.get('motion') ?? '').toLowerCase();
  if (m === 'reduce' || m === 'reduced' || m === 'static' || truthy(params.get('reduced-motion'))) motion = 'reduce';
  else if (m === 'full' || m === 'on') motion = 'full';

  return { renderer, motion, debug: truthy(params.get('debug')) };
}

export function resolveReducedMotion(override: MotionOverride, systemPrefersReduced: boolean): boolean {
  if (override === 'reduce') return true;
  if (override === 'full') return false;
  return systemPrefersReduced;
}

export type WebGLSupport = 'webgl2' | 'webgl' | 'none';

/** Initial renderer choice before any WebGL context exists. Runtime failures are handled separately. */
export function chooseRenderer(preference: RendererPreference, support: WebGLSupport): RendererMode {
  if (preference === 'fallback') return 'fallback';
  if (preference === 'webgl') return 'webgl';
  return support === 'none' ? 'fallback' : 'webgl';
}

/** Probe for WebGL without keeping a context alive. */
export function probeWebGL(doc: Document = document): WebGLSupport {
  try {
    const canvas = doc.createElement('canvas');
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: false };
    const gl2 = canvas.getContext('webgl2', attrs);
    const gl = gl2 ?? canvas.getContext('webgl', attrs);
    if (!gl) return 'none';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return gl2 ? 'webgl2' : 'webgl';
  } catch {
    return 'none';
  }
}

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Device class used to scale particle counts and DPR caps. */
export interface DeviceProfile {
  coarsePointer: boolean;
  smallScreen: boolean;
  lowMemory: boolean;
  cores: number;
}

export function readDeviceProfile(): DeviceProfile {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    smallScreen: Math.min(window.innerWidth, window.innerHeight) < 600,
    lowMemory: (nav.deviceMemory ?? 8) <= 4,
    cores: nav.hardwareConcurrency ?? 4,
  };
}

export interface QualityTier {
  /** Upper bound for devicePixelRatio. */
  maxDpr: number;
  particles: number;
  streaks: number;
}

export function qualityFor(profile: DeviceProfile): QualityTier {
  const constrained = profile.lowMemory || profile.cores <= 4;
  if (profile.smallScreen || profile.coarsePointer) {
    return constrained ? { maxDpr: 1.5, particles: 1800, streaks: 420 } : { maxDpr: 1.75, particles: 2600, streaks: 640 };
  }
  return constrained ? { maxDpr: 1.5, particles: 3600, streaks: 900 } : { maxDpr: 2, particles: 5200, streaks: 1400 };
}
