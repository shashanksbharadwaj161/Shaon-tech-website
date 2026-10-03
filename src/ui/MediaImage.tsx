import { useState, type ReactNode } from 'react';
import { fallbackSrc, MEDIA, srcSet, type MediaKey } from '../content/media';

interface MediaImageProps {
  media: MediaKey;
  /** The `sizes` attribute for responsive selection. */
  sizes: string;
  /** Above-the-fold images load eagerly; everything else is lazy. */
  eager?: boolean;
  /** Code-native drawing shown while loading and if the file is missing. */
  fallback: ReactNode;
  className?: string;
  /** Short caption shown under the image (e.g. "Concept render"). */
  caption?: string;
}

/**
 * AVIF/WebP responsive picture with real dimensions and a reserved aspect
 * ratio. The code-native drawing sits underneath until the image decodes; if
 * the file cannot be loaded it stays, labelled as a stand-in.
 */
export function MediaImage({ media, sizes, eager = false, fallback, className, caption }: MediaImageProps) {
  const m = MEDIA[media];
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <figure className={['media', className].filter(Boolean).join(' ')} data-state={state}>
      <div className="media__frame" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
        <div
          className="media__fallback"
          {...(state === 'failed'
            ? { role: 'img', 'aria-label': `${m.alt} (code-drawn stand-in: the render is not available)` }
            : { 'aria-hidden': true })}
        >
          {fallback}
        </div>
        {state !== 'failed' && (
          <picture className="media__picture">
            <source type="image/avif" srcSet={srcSet(m, 'avif')} sizes={sizes} />
            <source type="image/webp" srcSet={srcSet(m, 'webp')} sizes={sizes} />
            <img
              src={fallbackSrc(m)}
              width={m.width}
              height={m.height}
              alt={m.alt}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => setState('loaded')}
              onError={() => setState('failed')}
            />
          </picture>
        )}
      </div>
      {caption && <figcaption className="media__caption mono">{caption}</figcaption>}
    </figure>
  );
}
