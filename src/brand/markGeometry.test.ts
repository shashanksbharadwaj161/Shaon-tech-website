import { describe, expect, it } from 'vitest';
import { buildMark, DEFAULT_MARK_PARAMS, developedTop, foldPoint, ribbonSpec } from './markGeometry';

const spec = ribbonSpec();
const { slope, foldRadius, slit } = DEFAULT_MARK_PARAMS;

describe('Folded Signal construction', () => {
  it('folds the back band behind the crease and the front band in front of it', () => {
    const back = foldPoint(spec, spec.backLength * 0.5, 0);
    const front = foldPoint(spec, spec.backLength + spec.wrapLength + spec.frontLength * 0.5, 0);
    expect(back.z).toBeCloseTo(-foldRadius, 6);
    expect(front.z).toBeCloseTo(foldRadius, 6);
  });

  it('drops the band by slope × π × r while it wraps — the offset visible at each fold', () => {
    const drop = spec.backTop - spec.frontTop;
    expect(drop).toBeCloseTo(slope * Math.PI * foldRadius, 9);
    // The developed top edge is one straight line, so the drop comes from the wrap length alone.
    expect(developedTop(spec, spec.backLength) - developedTop(spec, spec.backLength + spec.wrapLength)).toBeCloseTo(drop, 9);
  });

  it('turns the band around: the front band runs back the other way', () => {
    const a = foldPoint(spec, spec.backLength + spec.wrapLength + 0.2, 0);
    const b = foldPoint(spec, spec.backLength + spec.wrapLength + 0.6, 0);
    expect(b.x - a.x).toBeCloseTo(0.4, 6); // heading +x after the fold
    const c = foldPoint(spec, 0.2, 0);
    const d = foldPoint(spec, 0.6, 0);
    expect(d.x - c.x).toBeCloseTo(-0.4, 6); // heading −x before it
  });

  it('unfolds to a flat beam whose length equals the developed length', () => {
    const start = foldPoint(spec, 0, 0, 0);
    const end = foldPoint(spec, spec.length, 0, 0);
    expect(start.z).toBeCloseTo(end.z, 9);
    expect(Math.abs(end.x - start.x)).toBeCloseTo(spec.length, 6);
  });

  it('keeps the central slit between the two front bands', () => {
    // Front band top edge (upper ribbon) vs. its 180° twin's bottom edge, at any x.
    for (const x of [-0.3, 0, 0.3]) {
      const frontTop = spec.frontTop - slope * (x - spec.axisX);
      const twinBottom = -(spec.frontTop - slope * (-x - spec.axisX));
      expect(twinBottom - frontTop).toBeCloseTo(slit, 9);
    }
  });

  it('is point-symmetric and normalised to unit height', () => {
    const mark = buildMark();
    const upper = mark.pieces.find((p) => p.id === 'upper-front')!.points;
    const lower = mark.pieces.find((p) => p.id === 'lower-front')!.points;
    expect(lower.length).toBe(upper.length);
    upper.forEach(([x, y], i) => {
      expect(lower[i]![0]).toBeCloseTo(-x, 9);
      expect(lower[i]![1]).toBeCloseTo(-y, 9);
    });
    const ys = mark.pieces.flatMap((p) => p.points.map(([, y]) => y));
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1, 6);
    // Proportions measured from the approved board (≈ 0.82–0.9 width : height).
    expect(mark.width).toBeGreaterThan(0.8);
    expect(mark.width).toBeLessThan(0.92);
  });
});
