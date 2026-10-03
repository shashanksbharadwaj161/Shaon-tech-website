/**
 * Writes public/favicon.svg from the shared mark geometry.
 * Run: node --experimental-strip-types scripts/generate-favicon.ts  (Node ≥ 22.6)
 * The PNG fallbacks (favicon-32.png, apple-touch-icon.png) are rasterised from
 * this SVG; see README → "Brand assets".
 */
import { writeFileSync } from 'node:fs';
import { buildMark, DEFAULT_MARK_PARAMS, pieceToPath } from '../src/brand/markGeometry.ts';

// Coarser sampling than the UI mark: straight edges need no intermediate points at icon size.
const MARK = buildMark(DEFAULT_MARK_PARAMS, 0.3);

const SIZE = 64;
const MARK_H = 42; // mark height inside the 64-unit tile
const crease = 2.6; // thicker than the UI logo so the fold survives at 16px
const w = MARK.width * MARK_H;
const ox = (SIZE - w) / 2;
const oy = (SIZE - MARK_H) / 2;

const path = (id: string) => {
  const piece = MARK.pieces.find((p) => p.id === id)!;
  return pieceToPath(piece.points, MARK_H, MARK.width, 1);
};

const ribbon = (key: 'upper' | 'lower') => `
    <mask id="c-${key}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="${w + 8}" height="${MARK_H + 8}">
      <rect x="-4" y="-4" width="${w + 8}" height="${MARK_H + 8}" fill="#fff"/>
      <path d="${path(`${key}-front`)}" fill="#000" stroke="#000" stroke-width="${crease}" stroke-linejoin="round"/>
    </mask>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>${ribbon('upper')}${ribbon('lower')}
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="14" fill="#07090D"/>
  <g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)})" fill="#F4F7FB">
    <path d="${path('upper-back')}" mask="url(#c-upper)"/>
    <path d="${path('upper-front')}"/>
    <path d="${path('lower-back')}" mask="url(#c-lower)"/>
    <path d="${path('lower-front')}"/>
  </g>
</svg>
`;

writeFileSync(new URL('../public/favicon.svg', import.meta.url), svg);
console.log(`favicon.svg written (${svg.length} bytes)`);
