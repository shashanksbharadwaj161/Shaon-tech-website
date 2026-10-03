/**
 * The Lab's visitor-controlled parameters for the folded S. Defaults are
 * documented here (and in the README) and restored by "Reset to defaults".
 * State lives only in memory while the page is open.
 */

export interface LabParams {
  /** Environment light angle around the object, degrees. */
  lightAngle: number;
  /** Strength of the studio lighting (environment intensity). */
  exposure: number;
  /** Electric-blue fresnel edge glow. */
  rim: number;
  /** How folded the ribbons are: 100 = the mark, 0 = laid flat. */
  fold: number;
  /** Twist along the height of the mark, degrees at the top edge. */
  twist: number;
  /** Share of the surface released as particles, percent. */
  signal: number;
  /** Speed of the particle lanes. */
  flow: number;
}

export const LAB_DEFAULTS: Readonly<LabParams> = Object.freeze({
  lightAngle: 40,
  exposure: 1,
  rim: 0.55,
  fold: 100,
  twist: 0,
  signal: 30,
  flow: 1,
});

export type LabGroup = 'light' | 'form' | 'signal';

export interface LabControl {
  key: keyof LabParams;
  group: LabGroup;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const deg = (v: number) => `${Math.round(v)}°`;
const pct = (v: number) => `${Math.round(v)}%`;
const times = (v: number) => `${v.toFixed(2)}×`;

export const LAB_CONTROLS: readonly LabControl[] = [
  { key: 'lightAngle', group: 'light', label: 'Light angle', hint: 'Turns the studio lights around the chrome.', min: 0, max: 360, step: 1, format: deg },
  { key: 'exposure', group: 'light', label: 'Light intensity', hint: 'Brightness of the reflections.', min: 0.4, max: 1.8, step: 0.05, format: times },
  { key: 'rim', group: 'light', label: 'Blue edge glow', hint: 'Electric-blue light along the edges.', min: 0, max: 1.5, step: 0.05, format: times },
  { key: 'fold', group: 'form', label: 'Fold', hint: '100% is the mark; 0% lays both ribbons flat.', min: 0, max: 100, step: 1, format: pct },
  { key: 'twist', group: 'form', label: 'Twist', hint: 'Twists the ribbons around their vertical axis.', min: -40, max: 40, step: 1, format: deg },
  { key: 'signal', group: 'signal', label: 'Particle intensity', hint: 'How much of the surface is released as signal.', min: 0, max: 100, step: 1, format: pct },
  { key: 'flow', group: 'signal', label: 'Flow speed', hint: 'How fast the released signal travels.', min: 0, max: 2, step: 0.05, format: times },
];

export const controlFor = (key: keyof LabParams): LabControl => LAB_CONTROLS.find((c) => c.key === key)!;

/** Clamp to the control's range and snap to its step (avoids float drift like 0.30000000004). */
export function clampParam(key: keyof LabParams, value: number): number {
  const c = controlFor(key);
  if (!Number.isFinite(value)) return LAB_DEFAULTS[key];
  const clamped = Math.min(c.max, Math.max(c.min, value));
  const snapped = Math.round((clamped - c.min) / c.step) * c.step + c.min;
  const decimals = (String(c.step).split('.')[1] ?? '').length;
  return Number(snapped.toFixed(decimals));
}

export function withParam(params: LabParams, key: keyof LabParams, value: number): LabParams {
  return { ...params, [key]: clampParam(key, value) };
}

export const isDefault = (params: LabParams): boolean =>
  (Object.keys(LAB_DEFAULTS) as (keyof LabParams)[]).every((k) => params[k] === LAB_DEFAULTS[k]);

/** Scene uniforms derived from the visitor's parameters (pure, shared by WebGL and SVG fallback). */
export function labUniforms(p: LabParams) {
  return {
    bend: (Math.PI * p.fold) / 100,
    /** Twist uniform is radians per band unit; the mark's top edge sits ~2.3 band units from centre. */
    twist: ((p.twist * Math.PI) / 180) / 2.3,
    rim: p.rim,
    edgeGlow: 0.25 + p.rim * 0.45,
    environment: p.exposure,
    envRotation: (p.lightAngle * Math.PI) / 180,
    release: (p.signal / 100) * 0.98,
    flowRate: 0.035 * p.flow,
  };
}

// ---- Live channel to the scene (no React renders per change) --------------
type Listener = () => void;
const listeners = new Set<Listener>();
export const labLive: {
  params: LabParams;
  /** Drag / pointer over the lab viewport, normalised -1..1 (y up). Optional — never required. */
  input: { x: number; y: number; active: boolean; pressAt: number };
} = { params: { ...LAB_DEFAULTS }, input: { x: 0, y: 0, active: false, pressAt: -1e9 } };

export function notifyLab(): void {
  listeners.forEach((fn) => fn());
}
export function setLabParams(params: LabParams): void {
  labLive.params = params;
  listeners.forEach((fn) => fn());
}
export function subscribeLab(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
