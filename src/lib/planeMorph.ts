/**
 * The four straight bands of the Folded Signal mark as quads, and helpers to
 * morph them into interface frames. Pure, so the morph is testable and the
 * same at any scroll position in either direction.
 */
import { MARK, RIBBON } from '../brand/markGeometry';
import { lerp, smoothstep } from './math';

export type Pt = readonly [number, number];
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = readonly [Pt, Pt, Pt, Pt];

/** Band quads in mark space (y up, centred, height ≈ 1). Upper back, upper front, lower front, lower back. */
export function markBandQuads(): Quad[] {
  const { slope, outerReach, innerReach } = RIBBON.params;
  const s = MARK.scale;
  const ax = RIBBON.axisX;
  const back = (x: number) => RIBBON.backTop + slope * (x - ax);
  const front = (x: number) => RIBBON.frontTop - slope * (x - ax);
  const upperBack: Quad = [
    [ax, back(ax)],
    [outerReach, back(outerReach)],
    [outerReach, back(outerReach) - 1],
    [ax, back(ax) - 1],
  ];
  const upperFront: Quad = [
    [ax, front(ax)],
    [innerReach, front(innerReach)],
    [innerReach, front(innerReach) - 1],
    [ax, front(ax) - 1],
  ];
  // 180° rotation; reorder corners so they stay TL, TR, BR, BL.
  const rot = (q: Quad): Quad => [
    [-q[2][0], -q[2][1]],
    [-q[3][0], -q[3][1]],
    [-q[0][0], -q[0][1]],
    [-q[1][0], -q[1][1]],
  ];
  const scale = (q: Quad): Quad => q.map(([x, y]) => [x * s, y * s] as Pt) as unknown as Quad;
  return [upperBack, upperFront, rot(upperFront), rot(upperBack)].map(scale);
}

/** Place a mark-space quad into an SVG box (y down). */
export function toSvg(q: Quad, cx: number, cy: number, size: number): Quad {
  return q.map(([x, y]) => [cx + x * size, cy - y * size] as Pt) as unknown as Quad;
}

export const rectQuad = (x: number, y: number, w: number, h: number): Quad => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

export function mixQuad(a: Quad, b: Quad, t: number): Quad {
  return a.map((p, i) => [lerp(p[0], b[i]![0], t), lerp(p[1], b[i]![1], t)] as Pt) as unknown as Quad;
}

export const quadPoints = (q: Quad): string => q.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** Staggered per-plane progress: plane `i` of `n` unfolds a little after the previous one. */
export function planeProgress(t: number, i: number, n: number, span = 0.5): number {
  const lag = n > 1 ? ((1 - span) * i) / (n - 1) : 0;
  return smoothstep(lag, lag + span, t);
}
