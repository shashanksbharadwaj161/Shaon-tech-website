/**
 * Folded Signal — the approved ShaOn Tech mark (logo direction A), as geometry.
 *
 * The flat logo is modelled as the front view of a real object: two flat ribbons,
 * each wrapped half a turn around a vertical crease cylinder. Every band runs at
 * the same slope, so a ribbon keeps descending while it wraps; the band that comes
 * out in front therefore sits lower than the band that went in behind. That drop
 * (slope × π × radius) is the offset visible at each fold of the approved logo,
 * and the cylinder's silhouette gives the rounded fold corners and the curved
 * crease line.
 *
 * The upper ribbon folds on the left. The lower ribbon is the same ribbon rotated
 * 180° about the centre, so the mark is point-symmetric. The two middle bands are
 * the front layer; the outer bands tuck behind at the folds.
 *
 * Everything here is pure maths (no DOM, no three.js) so the SVG logo, favicon
 * and the WebGL chrome object are all derived from one source of truth.
 *
 * Units: parameters are in multiples of the band's vertical thickness. Use
 * `MARK.scale` to convert to "mark height = 1" units.
 */

export type Vec2 = readonly [x: number, y: number];

export interface MarkParams {
  /** Rise over run of every band (≈ tan 21.6°, measured from the approved board). */
  slope: number;
  /** Half the overall width, measured to the outermost point of a fold. */
  halfWidth: number;
  /** Radius of the crease cylinder each ribbon wraps around. */
  foldRadius: number;
  /** Vertical gap between the two middle (front) bands — the central slit. */
  slit: number;
  /** x of each front band's free end (from centre; positive = past the centre line). */
  innerReach: number;
  /** x of each back band's free end. */
  outerReach: number;
  /** Fillet radius on the free ends. */
  endRadius: number;
}

export const DEFAULT_MARK_PARAMS: MarkParams = {
  slope: 0.396,
  halfWidth: 1.93,
  foldRadius: 0.56,
  slit: 0.08,
  innerReach: 0.04,
  outerReach: 1.42,
  endRadius: 0.24,
};

/** Derived dimensions of one ribbon, in band-thickness units. */
export interface RibbonSpec {
  params: MarkParams;
  /** x of the crease cylinder's axis for the upper (left-folding) ribbon. */
  axisX: number;
  /** Top edge height where the back band reaches the crease axis. */
  backTop: number;
  /** Top edge height where the front band leaves the crease axis. */
  frontTop: number;
  /** Developed length of the back band (free end → crease). */
  backLength: number;
  /** Developed length of the wrapped zone (π r). */
  wrapLength: number;
  /** Developed length of the front band (crease → free end). */
  frontLength: number;
  /** Total developed length of the ribbon. */
  length: number;
}

export function ribbonSpec(params: MarkParams = DEFAULT_MARK_PARAMS): RibbonSpec {
  const { slope, halfWidth, foldRadius, slit, innerReach, outerReach } = params;
  const axisX = -(halfWidth - foldRadius);
  // The slit between the front band and its rotated twin is constant along x:
  // gap = 2·(slope·(halfWidth − r) − frontTop)  →  solve for frontTop.
  const frontTop = slope * (halfWidth - foldRadius) - slit / 2;
  const wrapLength = Math.PI * foldRadius;
  const backTop = frontTop + slope * wrapLength;
  const backLength = outerReach - axisX;
  const frontLength = innerReach - axisX;
  return {
    params,
    axisX,
    backTop,
    frontTop,
    backLength,
    wrapLength,
    frontLength,
    length: backLength + wrapLength + frontLength,
  };
}

/** Top edge of the developed (unrolled) ribbon at arc length ξ. Bottom = top − 1. */
export function developedTop(spec: RibbonSpec, xi: number): number {
  return spec.backTop + spec.params.slope * (spec.backLength - xi);
}

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
const len = (a: Vec2): number => Math.hypot(a[0], a[1]);
const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};

/**
 * Fillet every corner of a convex polygon and resample its straight edges so no
 * segment is longer than `edgeStep`. Returns a dense closed outline (no repeated
 * end point) with the polygon's original winding.
 */
export function filletPolygon(
  corners: readonly Vec2[],
  radius: number,
  arcSegments = 10,
  edgeStep = Infinity,
): Vec2[] {
  const n = corners.length;
  const arcs: { start: Vec2; end: Vec2; points: Vec2[] }[] = [];
  for (let i = 0; i < n; i++) {
    const c = corners[i]!;
    const prev = corners[(i - 1 + n) % n]!;
    const next = corners[(i + 1) % n]!;
    const u1 = norm(sub(prev, c));
    const u2 = norm(sub(next, c));
    const cosA = Math.min(1, Math.max(-1, u1[0] * u2[0] + u1[1] * u2[1]));
    const half = Math.acos(cosA) / 2;
    const t = radius / Math.tan(half);
    const start = add(c, mul(u1, t));
    const end = add(c, mul(u2, t));
    const centre = add(c, mul(norm(add(u1, u2)), radius / Math.sin(half)));
    let a0 = Math.atan2(start[1] - centre[1], start[0] - centre[0]);
    let a1 = Math.atan2(end[1] - centre[1], end[0] - centre[0]);
    let d = a1 - a0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    a1 = a0 + d;
    const points: Vec2[] = [];
    for (let k = 0; k <= arcSegments; k++) {
      const a = a0 + ((a1 - a0) * k) / arcSegments;
      points.push([centre[0] + Math.cos(a) * radius, centre[1] + Math.sin(a) * radius]);
    }
    arcs.push({ start, end, points });
  }
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const arc = arcs[i]!;
    out.push(...arc.points);
    const from = arc.end;
    const to = arcs[(i + 1) % n]!.start;
    const steps = Number.isFinite(edgeStep) ? Math.max(1, Math.ceil(len(sub(to, from)) / edgeStep)) : 1;
    for (let k = 1; k < steps; k++) out.push(add(from, mul(sub(to, from), k / steps)));
  }
  return out;
}

/** Signed area (positive = counter-clockwise). */
export function signedArea(points: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/**
 * Offset a convex counter-clockwise outline inwards by `distance` using averaged
 * edge normals. Valid while `distance` is smaller than the smallest fillet.
 */
export function insetOutline(points: readonly Vec2[], distance: number): Vec2[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n]!;
    const next = points[(i + 1) % n]!;
    const e1 = norm(sub(p, prev));
    const e2 = norm(sub(next, p));
    // Inward normal of a CCW edge (dx, dy) is (−dy, dx).
    const n1: Vec2 = [-e1[1], e1[0]];
    const n2: Vec2 = [-e2[1], e2[0]];
    const m = norm(add(n1, n2));
    const cos = m[0] * n1[0] + m[1] * n1[1];
    return add(p, mul(m, distance / Math.max(0.35, cos)));
  });
}

export interface DevelopedRibbon {
  spec: RibbonSpec;
  /** Dense counter-clockwise outline of the unrolled ribbon in (ξ, y). */
  outline: Vec2[];
}

/**
 * The unrolled ribbon: one long parallelogram (vertical end cuts) with filleted
 * free ends, sampled densely along its length so it bends smoothly.
 */
export function developedRibbon(
  params: MarkParams = DEFAULT_MARK_PARAMS,
  edgeStep = 0.04,
): DevelopedRibbon {
  const spec = ribbonSpec(params);
  const L = spec.length;
  const t0 = developedTop(spec, 0);
  const t1 = developedTop(spec, L);
  const corners: Vec2[] = [
    [0, t0 - 1],
    [L, t1 - 1],
    [L, t1],
    [0, t0],
  ];
  return { spec, outline: filletPolygon(corners, params.endRadius, 10, edgeStep) };
}

/** Where a developed point lands when the ribbon is folded by `bend` radians (π = the mark). */
export interface FoldedPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Bend the developed ribbon. The back band lies in the plane z = −r heading −x;
 * the wrap zone (length π·r) is bent uniformly by `bend` radians; the front band
 * continues straight. `bend = π` reproduces the mark, `bend = 0` lays the ribbon
 * flat as one long diagonal beam. Mirrors the GLSL in `scene/ribbonShader.ts`.
 */
export function foldPoint(spec: RibbonSpec, xi: number, y: number, bend = Math.PI): FoldedPoint {
  const r = spec.params.foldRadius;
  const startX = spec.params.outerReach;
  const z0 = -r;
  if (xi <= spec.backLength) return { x: startX - xi, y, z: z0 };
  const zoneX = startX - spec.backLength;
  const s = Math.min(xi - spec.backLength, spec.wrapLength);
  const k = bend / spec.wrapLength;
  let x: number;
  let z: number;
  if (Math.abs(k) < 1e-6) {
    x = zoneX - s;
    z = z0;
  } else {
    const rr = 1 / k;
    x = zoneX - rr * Math.sin(k * s);
    z = z0 + rr * (1 - Math.cos(k * s));
  }
  const rest = xi - spec.backLength - spec.wrapLength;
  if (rest > 0) {
    x += -Math.cos(bend) * rest;
    z += Math.sin(bend) * rest;
  }
  return { x, y, z };
}

/** Clip a convex polygon to ξ ≤ cut (keep = 'below') or ξ ≥ cut (keep = 'above'). */
export function clipX(points: readonly Vec2[], cut: number, keep: 'below' | 'above'): Vec2[] {
  const inside = (p: Vec2) => (keep === 'below' ? p[0] <= cut : p[0] >= cut);
  const out: Vec2[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (cut - a[0]) / (b[0] - a[0]);
      out.push([cut, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export interface MarkPiece {
  id: 'upper-back' | 'upper-front' | 'lower-back' | 'lower-front';
  layer: 'back' | 'front';
  /** Closed outline in mark space (y up, centred, height ≈ 1). */
  points: Vec2[];
}

export interface MarkShape {
  pieces: MarkPiece[];
  /** Multiply band-thickness units by this to get "mark height = 1" units. */
  scale: number;
  width: number;
  height: number;
}

/**
 * The flat logo: the front (orthographic) view of the folded object. Each ribbon
 * splits at the middle of its wrap into the part behind the crease axis (back)
 * and the part in front of it (front).
 */
export function buildMark(params: MarkParams = DEFAULT_MARK_PARAMS, edgeStep = 0.03): MarkShape {
  const { spec, outline } = developedRibbon(params, edgeStep);
  const mid = spec.backLength + spec.wrapLength / 2;
  const project = (pts: Vec2[]): Vec2[] =>
    pts.map(([xi, y]) => {
      const p = foldPoint(spec, xi, y);
      return [p.x, p.y] as Vec2;
    });
  const back = project(clipX(outline, mid, 'below'));
  const front = project(clipX(outline, mid, 'above'));
  const rot = (pts: Vec2[]): Vec2[] => pts.map(([x, y]) => [-x, -y] as Vec2);

  let maxY = 0;
  let maxX = 0;
  for (const [x, y] of [...back, ...front]) {
    maxY = Math.max(maxY, Math.abs(y));
    maxX = Math.max(maxX, Math.abs(x));
  }
  const scale = 1 / (2 * maxY);
  const s = (pts: Vec2[]): Vec2[] => pts.map(([x, y]) => [x * scale, y * scale] as Vec2);
  return {
    scale,
    width: 2 * maxX * scale,
    height: 1,
    pieces: [
      { id: 'upper-back', layer: 'back', points: s(back) },
      { id: 'lower-back', layer: 'back', points: s(rot(back)) },
      { id: 'upper-front', layer: 'front', points: s(front) },
      { id: 'lower-front', layer: 'front', points: s(rot(front)) },
    ],
  };
}

/**
 * SVG path data for a piece. Mark space is y-up and centred; SVG is y-down, so
 * points are flipped and shifted into a viewBox of `0 0 size*width size`.
 */
export function pieceToPath(points: readonly Vec2[], size: number, width: number, precision = 2): string {
  const f = (v: number) => Number(v.toFixed(precision)).toString();
  const ox = (width * size) / 2;
  const oy = size / 2;
  return (
    points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(ox + x * size)} ${f(oy - y * size)}`)
      .join('') + 'Z'
  );
}

/** The default mark, computed once. */
export const MARK: MarkShape = buildMark();
export const RIBBON = ribbonSpec();
