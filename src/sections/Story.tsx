import { useRef } from 'react';
import { FoldedMark } from '../brand/FoldedMark';
import { site } from '../content/site';
import { useStoryDriver } from '../hooks/useStoryDriver';
import { useMotion } from '../motion/MotionProvider';
import { SignalLanes } from '../stage/SignalLanes';
import { Stage } from '../stage/Stage';
import { MotionText } from '../ui/MotionText';
import { Hero } from './Hero';
import { InterfacePreview } from './InterfacePreview';
import { Wireframe } from './Wireframe';

const { story } = site;

/**
 * Hero + the idea → product sequence share one stage. In cinematic mode the
 * stage is sticky behind both and the sequence is pinned with native
 * `position: sticky` — no wheel or touch hijacking. With reduced motion the
 * same story is told as four still, stacked chapters.
 */
export function Story() {
  const { reduced } = useMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const sequenceRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useStoryDriver({ root: rootRef, hero: heroRef, sequence: sequenceRef, pin: pinRef, preview: previewRef }, !reduced, true);

  if (reduced) {
    return (
      <div className="story story--static" ref={rootRef}>
        <Hero heroRef={heroRef} stage={<Stage mode="static" />} />
        <StoryStatic />
      </div>
    );
  }

  return (
    <div className="story story--cinematic" ref={rootRef} data-chapter="0">
      <div className="story__stage">
        <Stage mode="cinematic" />
      </div>
      <div className="story__content">
        <Hero heroRef={heroRef} />
        <section id="story" ref={sequenceRef} className="seq" aria-labelledby="story-title" data-cinematic-range>
          <div className="seq__pin" ref={pinRef}>
            <h2 id="story-title" className="seq__title mono">
              <span className="seq__title-mark" aria-hidden="true" />
              {story.label}
            </h2>
            <ol className="seq__chapters">
              {story.chapters.map((c, i) => (
                <li key={c.id} className="seq__chapter" data-chapter-i={i} data-state={i === 0 ? 'active' : 'after'}>
                  <article aria-labelledby={`chapter-${c.id}`}>
                    <p className="seq__kicker mono">
                      <span className="seq__index">{c.index}</span>
                      <span className="seq__kicker-rule" aria-hidden="true" />
                      {c.kicker}
                    </p>
                    <h3 id={`chapter-${c.id}`} className="seq__heading">
                      <MotionText effect="fold" trigger="chapter">{c.title}</MotionText>
                    </h3>
                    <p className="seq__body">{c.body}</p>
                  </article>
                </li>
              ))}
            </ol>
            <figure className="seq__preview" ref={previewRef}>
              <Wireframe />
              <InterfacePreview />
              <figcaption className="seq__caption mono">{story.previewLabel}</figcaption>
            </figure>
            <div className="seq__rail" aria-hidden="true">
              {story.chapters.map((c, i) => (
                <span key={c.id} className="seq__tick" data-i={i}>
                  {c.index}
                </span>
              ))}
              <span className="seq__progress">
                <span />
              </span>
            </div>
            <a className="seq__skip mono" href="#work">
              {story.skip}
              <span aria-hidden="true"> ↓</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function StoryStatic() {
  const illustrations = [
    <div key="idea" className="still still--idea">
      <FoldedMark variant="chrome" className="still__mark" />
    </div>,
    <div key="signal" className="still still--signal">
      <SignalLanes />
    </div>,
    <div key="structure" className="still still--structure">
      <div className="still__frame" style={{ ['--wire' as string]: 1, ['--structure' as string]: 1 }}>
        <Wireframe />
      </div>
    </div>,
    <div key="product" className="still still--product">
      <div className="still__frame" style={{ ['--product' as string]: 1, ['--wire' as string]: 1 }}>
        <Wireframe />
        <InterfacePreview />
      </div>
    </div>,
  ];
  return (
    <section id="story" className="story-static" aria-labelledby="story-title">
      <h2 id="story-title" className="story-static__title mono">
        {story.label}
      </h2>
      <ol className="story-static__list">
        {story.chapters.map((c, i) => (
          <li key={c.id} className="story-static__item">
            <figure className="story-static__figure" aria-hidden="true">
              {illustrations[i]}
            </figure>
            <article className="story-static__copy" aria-labelledby={`still-${c.id}`}>
              <p className="seq__kicker mono">
                <span className="seq__index">{c.index}</span>
                <span className="seq__kicker-rule" aria-hidden="true" />
                {c.kicker}
              </p>
              <h3 id={`still-${c.id}`} className="seq__heading">
                {c.title}
              </h3>
              <p className="seq__body">{c.body}</p>
              {c.id === 'product' && <p className="seq__caption mono">{story.previewLabel}</p>}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
