import { useId, useState } from 'react';
import { MEDIA } from '../../content/media';
import { LampDrawing } from '../../ui/ConceptDrawings';
import { MediaImage } from '../../ui/MediaImage';
import { DEFAULT_FINISH, getSize, variantId, variantName, type Finish, type Size } from './commerceModel';

type ViewId = 'render' | 'profile' | 'top';

const VIEWS: readonly { id: ViewId; label: string }[] = [
  { id: 'render', label: 'Render' },
  { id: 'profile', label: 'Profile' },
  { id: 'top', label: 'Top' },
];

const ASPECT = `${MEDIA.lamp.width} / ${MEDIA.lamp.height}`;

interface LampGalleryProps {
  finish: Finish;
  size: Size;
}

/**
 * One concept render plus two code-native views. The render is a single fixed
 * image and is never altered to fake a variant; the drawings follow the
 * selected finish and size.
 */
export function LampGallery({ finish, size }: LampGalleryProps) {
  const [view, setView] = useState<ViewId>('render');
  const stageId = useId();
  const switcherLabelId = useId();
  const scale = getSize(size).scale;
  const selection = variantName(variantId(size, finish));
  const activeLabel = VIEWS.find((v) => v.id === view)?.label ?? 'Render';

  return (
    <div className="cm-gallery">
      <div className="cm-gallery__stage" id={stageId}>
        {/* The render stays mounted so returning to it does not reload the image. */}
        <div className="cm-gallery__pane" hidden={view !== 'render'}>
          <MediaImage
            media="lamp"
            className="cm-gallery__media"
            sizes="(min-width: 1100px) 520px, (min-width: 720px) 48vw, 100vw"
            fallback={<LampDrawing view="front" finish={finish} scale={scale} />}
            caption="Concept render — fictional object"
          />
          {finish !== DEFAULT_FINISH && (
            <p className="cm-gallery__note">Render shows polished silver; drawings show your selection.</p>
          )}
        </div>
        {view !== 'render' && (
          <figure className="cm-gallery__pane cm-gallery__drawing" key={`${view}-${size}-${finish}`}>
            <div className="cm-gallery__frame" style={{ aspectRatio: ASPECT }}>
              <LampDrawing
                view={view}
                finish={finish}
                scale={scale}
                title={`${activeLabel} drawing of the fictional capsule lamp: ${selection}`}
              />
            </div>
            <figcaption className="media__caption mono">
              Code drawing · {activeLabel} · {selection}
            </figcaption>
          </figure>
        )}
      </div>

      <div className="cm-gallery__views">
        <span className="cm-gallery__views-label mono" id={switcherLabelId}>
          View
        </span>
        <div className="cm-gallery__chips" role="group" aria-labelledby={switcherLabelId}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="chip cm-gallery__chip"
              aria-pressed={view === v.id}
              aria-controls={stageId}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
