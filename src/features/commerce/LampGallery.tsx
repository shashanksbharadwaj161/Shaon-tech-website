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
 *
 * Layout stays still on touch: the view switcher sits above the stage (the
 * render and drawing captions wrap differently), and the note below keeps the
 * same height whichever text is showing.
 */
export function LampGallery({ finish, size }: LampGalleryProps) {
  const [view, setView] = useState<ViewId>('render');
  const stageId = useId();
  const switcherLabelId = useId();
  const scale = getSize(size).scale;
  const selection = variantName(variantId(size, finish));
  const activeLabel = VIEWS.find((v) => v.id === view)?.label ?? 'Render';
  const finishDiffers = finish !== DEFAULT_FINISH;

  return (
    <div className="cm-gallery">
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

      {/* All three texts share one grid cell, so the note never changes height.
          Only one is visible (and exposed to assistive tech) at a time; the
          last one replaces the others, via CSS, when the render file cannot
          load and MediaImage keeps its code-drawn stand-in. */}
      <p className="cm-gallery__note">
        <span className="cm-gallery__note-text" data-on={!finishDiffers}>
          The render is one fixed image; drawings show your selection.
        </span>
        <span className="cm-gallery__note-text" data-on={finishDiffers}>
          Render shows polished silver; drawings show your selection.
        </span>
        <span className="cm-gallery__note-text cm-gallery__note-text--fallback">
          Render unavailable; the code drawing shows your selection.
        </span>
      </p>
    </div>
  );
}
