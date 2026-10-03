/**
 * Responsive concept imagery supplied by the media owner. Files live in
 * public/media in the local preview only; they are not committed. Every image
 * has a code-native fallback, so a missing file degrades to original geometry.
 *
 * Each file name carries its nominal size; `w` is the file's real pixel width
 * (the largest files are smaller than their nominal 1680).
 */
export interface MediaSource {
  /** Nominal size in the file name. */
  name: 640 | 960 | 1680;
  /** Actual pixel width of the file. */
  w: number;
}

export interface ResponsiveMedia {
  base: string;
  width: number;
  height: number;
  sources: MediaSource[];
  alt: string;
}

export const MEDIA = {
  lamp: {
    base: '/media/form-lamp-silver',
    width: 1254,
    height: 1254,
    sources: [
      { name: 640, w: 640 },
      { name: 960, w: 960 },
      { name: 1680, w: 1254 },
    ],
    alt: 'Concept render of a fictional silver capsule lamp, made for this studio demo.',
  },
  pavilion: {
    base: '/media/still-pavilion-blue',
    width: 1672,
    height: 941,
    sources: [
      { name: 640, w: 640 },
      { name: 960, w: 960 },
      { name: 1680, w: 1672 },
    ],
    alt: 'Concept render of a fictional pavilion in cool blue light, made for this studio demo.',
  },
} satisfies Record<string, ResponsiveMedia>;

export type MediaKey = keyof typeof MEDIA;

export function srcSet(media: ResponsiveMedia, format: 'avif' | 'webp'): string {
  return media.sources.map((s) => `${media.base}-${s.name}.${format} ${s.w}w`).join(', ');
}

export function fallbackSrc(media: ResponsiveMedia): string {
  return `${media.base}-960.webp`;
}
