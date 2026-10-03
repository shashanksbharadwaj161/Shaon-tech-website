import { BufferGeometry, Float32BufferAttribute, Sphere, Vector3 } from 'three';
import {
  DEFAULT_MARK_PARAMS,
  developedRibbon,
  foldPoint,
  insetOutline,
  signedArea,
  type MarkParams,
  type RibbonSpec,
  type Vec2,
} from '../brand/markGeometry';

export interface RibbonGeometryOptions {
  params?: MarkParams;
  /** Sheet thickness (band-thickness units). */
  thickness?: number;
  /** Chamfer size for the faceted edges. */
  chamfer?: number;
  /** Max developed length between outline samples (controls bend smoothness). */
  edgeStep?: number;
}

export interface RibbonGeometryResult {
  geometry: BufferGeometry;
  spec: RibbonSpec;
  /** Developed outline (inset), for sampling particles on the faces. */
  faceOutline: Vec2[];
  thickness: number;
}

/**
 * Build one ribbon as an unrolled, chamfered slab. Each vertex stores its
 * developed coordinate `aDev = (ξ, y, n)` and developed normal `aDevNormal`;
 * `ribbonShader` bends it on the GPU. `position` holds the folded state for
 * bounds and as a sensible default.
 *
 * Faces are triangulated as a zig-zag strip between the lower and upper chains
 * of the convex outline, so every triangle spans only a short stretch of ξ —
 * the direction the ribbon bends in.
 */
export function createRibbonGeometry(opts: RibbonGeometryOptions = {}): RibbonGeometryResult {
  const params = opts.params ?? DEFAULT_MARK_PARAMS;
  const thickness = opts.thickness ?? 0.2;
  const chamfer = opts.chamfer ?? 0.06;
  const { spec, outline } = developedRibbon(params, opts.edgeStep ?? 0.035);
  const outer = signedArea(outline) > 0 ? outline : [...outline].reverse();
  const inner = insetOutline(outer, chamfer);
  const n = outer.length;
  const ht = thickness / 2;

  const dev: number[] = [];
  const devNormal: number[] = [];
  const edge: number[] = [];
  const index: number[] = [];

  const push = (p: Vec2, nn: number, nx: number, ny: number, nz: number, e: number): number => {
    dev.push(p[0], p[1], nn);
    const l = Math.hypot(nx, ny, nz) || 1;
    devNormal.push(nx / l, ny / l, nz / l);
    edge.push(e);
    return dev.length / 3 - 1;
  };

  // Outward 2D normals of the outer outline (CCW → outward is (dy, −dx)).
  const outward: Vec2[] = outer.map((_, i) => {
    const a = outer[(i - 1 + n) % n]!;
    const b = outer[(i + 1) % n]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l] as Vec2;
  });

  // --- Faces --------------------------------------------------------------
  // Split the inset outline into lower and upper chains between its extreme ξ.
  let iMin = 0;
  let iMax = 0;
  for (let i = 0; i < n; i++) {
    const p = inner[i]!;
    const a = inner[iMin]!;
    const b = inner[iMax]!;
    if (p[0] < a[0] - 1e-9 || (Math.abs(p[0] - a[0]) <= 1e-9 && p[1] < a[1])) iMin = i;
    if (p[0] > b[0] + 1e-9 || (Math.abs(p[0] - b[0]) <= 1e-9 && p[1] < b[1])) iMax = i;
  }
  const lower: number[] = [];
  for (let i = iMin; ; i = (i + 1) % n) {
    lower.push(i);
    if (i === iMax) break;
  }
  const upper: number[] = [];
  for (let i = iMin; ; i = (i - 1 + n) % n) {
    upper.push(i);
    if (i === iMax) break;
  }

  const buildFace = (sign: 1 | -1) => {
    const base = dev.length / 3;
    for (let i = 0; i < n; i++) push(inner[i]!, sign * ht, 0, 0, sign, 0);
    let a = 0;
    let b = 0;
    const tri = (i0: number, i1: number, i2: number) => {
      if (i0 === i1 || i1 === i2 || i0 === i2) return;
      if (sign > 0) index.push(base + i0, base + i1, base + i2);
      else index.push(base + i0, base + i2, base + i1);
    };
    while (a < lower.length - 1 || b < upper.length - 1) {
      const nextLower = a < lower.length - 1 ? inner[lower[a + 1]!]![0] : Infinity;
      const nextUpper = b < upper.length - 1 ? inner[upper[b + 1]!]![0] : Infinity;
      if (nextLower <= nextUpper) {
        tri(lower[a]!, lower[a + 1]!, upper[b]!);
        a++;
      } else {
        tri(lower[a]!, upper[b + 1]!, upper[b]!);
        b++;
      }
    }
  };
  buildFace(1);
  buildFace(-1);

  // --- Rim: front chamfer, wall, back chamfer -----------------------------
  const band = (
    ringA: { pts: Vec2[]; n: number },
    ringB: { pts: Vec2[]; n: number },
    normalZ: number,
    e: number,
  ) => {
    const startA = dev.length / 3;
    for (let i = 0; i < n; i++) {
      const o = outward[i]!;
      push(ringA.pts[i]!, ringA.n, o[0], o[1], normalZ, e);
    }
    const startB = dev.length / 3;
    for (let i = 0; i < n; i++) {
      const o = outward[i]!;
      push(ringB.pts[i]!, ringB.n, o[0], o[1], normalZ, e);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.push(startA + i, startB + i, startB + j, startA + i, startB + j, startA + j);
    }
  };
  band({ pts: inner, n: ht }, { pts: outer, n: ht - chamfer }, 1, 1);
  band({ pts: outer, n: ht - chamfer }, { pts: outer, n: -ht + chamfer }, 0, 0.55);
  band({ pts: outer, n: -ht + chamfer }, { pts: inner, n: -ht }, -1, 1);

  // --- Folded positions / normals for bounds ------------------------------
  const count = dev.length / 3;
  const position = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const xi = dev[i * 3]!;
    const y = dev[i * 3 + 1]!;
    const nn = dev[i * 3 + 2]!;
    const p = foldPoint(spec, xi, y);
    // Outward direction at this ξ for the folded state.
    const a = Math.min(Math.max(xi - spec.backLength, 0), spec.wrapLength) / spec.wrapLength * Math.PI;
    position[i * 3] = p.x - Math.sin(a) * nn;
    position[i * 3 + 1] = p.y;
    position[i * 3 + 2] = p.z - Math.cos(a) * nn;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(new Float32Array(count * 3).fill(0), 3));
  geometry.setAttribute('aDev', new Float32BufferAttribute(dev, 3));
  geometry.setAttribute('aDevNormal', new Float32BufferAttribute(devNormal, 3));
  geometry.setAttribute('aEdge', new Float32BufferAttribute(edge, 1));
  geometry.setIndex(index);
  // The shader can unfold the ribbon to ~2.5× its folded extent; give culling a generous sphere.
  geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), spec.length + 2);

  return { geometry, spec, faceOutline: inner, thickness };
}
