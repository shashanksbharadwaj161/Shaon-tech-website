/**
 * The product interface that the story resolves into, described once in a
 * 1000 × 640 design space. The SVG wireframe, the HTML interface and the
 * particle targets in WebGL are all generated from these regions, so the
 * particles land exactly on the lines that then fill with real UI.
 */

export const PREVIEW_W = 1000;
export const PREVIEW_H = 640;
export const PREVIEW_ASPECT = PREVIEW_W / PREVIEW_H;

export type RegionKind = 'frame' | 'bar' | 'nav' | 'title' | 'text' | 'button' | 'media' | 'card' | 'row' | 'tab';

export interface PreviewRegion {
  id: string;
  kind: RegionKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corner radius in design units. */
  r: number;
  /** 0..1 stagger order for drawing / filling. */
  order: number;
  /** Which device the region belongs to. */
  device: 'browser' | 'phone';
}

const R = (
  id: string,
  kind: RegionKind,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  order: number,
  device: 'browser' | 'phone' = 'browser',
): PreviewRegion => ({ id, kind, x, y, w, h, r, order, device });

export const PREVIEW_REGIONS: PreviewRegion[] = [
  R('browser', 'frame', 0, 24, 820, 576, 18, 0),
  R('browser-bar', 'bar', 0, 24, 820, 40, 18, 0.06),
  R('nav', 'nav', 36, 92, 748, 30, 6, 0.12),
  R('title', 'title', 36, 158, 392, 132, 6, 0.2),
  R('text', 'text', 36, 306, 330, 48, 6, 0.3),
  R('cta-a', 'button', 36, 378, 150, 44, 22, 0.38),
  R('cta-b', 'button', 198, 378, 132, 44, 22, 0.42),
  R('media', 'media', 460, 146, 324, 278, 14, 0.26),
  R('card-a', 'card', 36, 456, 236, 112, 12, 0.5),
  R('card-b', 'card', 292, 456, 236, 112, 12, 0.56),
  R('card-c', 'card', 548, 456, 236, 112, 12, 0.62),
  R('phone', 'frame', 764, 128, 220, 496, 30, 0.34, 'phone'),
  R('phone-head', 'nav', 784, 164, 180, 26, 6, 0.48, 'phone'),
  R('phone-media', 'media', 784, 206, 180, 152, 12, 0.56, 'phone'),
  R('phone-row-a', 'row', 784, 374, 180, 46, 10, 0.64, 'phone'),
  R('phone-row-b', 'row', 784, 430, 180, 46, 10, 0.7, 'phone'),
  R('phone-row-c', 'row', 784, 486, 180, 46, 10, 0.76, 'phone'),
  R('phone-tab', 'tab', 784, 560, 180, 40, 20, 0.82, 'phone'),
];

/** Percent-based CSS box for a region inside the preview container. */
export function regionBox(r: PreviewRegion): { left: string; top: string; width: string; height: string } {
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
  return { left: pct(r.x, PREVIEW_W), top: pct(r.y, PREVIEW_H), width: pct(r.w, PREVIEW_W), height: pct(r.h, PREVIEW_H) };
}

/** Deterministic PRNG (mulberry32) so layouts and particle fields are stable between runs. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample points on region outlines in normalised preview space (0..1, y down),
 * distributed by perimeter length. Frames get a little more weight so the
 * device silhouettes read first.
 */
export function samplePreviewOutline(count: number, seed = 7): Float32Array {
  const rand = seeded(seed);
  const weights = PREVIEW_REGIONS.map((r) => 2 * (r.w + r.h) * (r.kind === 'frame' ? 1.5 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    let pick = rand() * total;
    let idx = 0;
    while (idx < weights.length - 1 && pick > weights[idx]!) {
      pick -= weights[idx]!;
      idx++;
    }
    const r = PREVIEW_REGIONS[idx]!;
    const per = 2 * (r.w + r.h);
    let d = rand() * per;
    let x: number;
    let y: number;
    if (d < r.w) {
      x = r.x + d;
      y = r.y;
    } else if ((d -= r.w) < r.h) {
      x = r.x + r.w;
      y = r.y + d;
    } else if ((d -= r.h) < r.w) {
      x = r.x + r.w - d;
      y = r.y + r.h;
    } else {
      d -= r.w;
      x = r.x;
      y = r.y + r.h - d;
    }
    out[i * 2] = x / PREVIEW_W;
    out[i * 2 + 1] = y / PREVIEW_H;
  }
  return out;
}
