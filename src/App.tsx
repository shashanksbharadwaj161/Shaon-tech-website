import { useEffect } from 'react';
import { site, type SectionId } from './content/site';
import { useActiveSection, useRevealObservers } from './hooks/useViewportObservers';
import { installPointerTracking } from './lib/liveState';
import { installHashNavigation } from './lib/navigation';
import { useMotion } from './motion/MotionProvider';
import { Footer } from './sections/Footer';
import { Lab } from './sections/Lab';
import { Services } from './sections/Services';
import { StartProject } from './sections/StartProject';
import { Story } from './sections/Story';
import { Studio } from './sections/Studio';
import { Work } from './sections/Work';
import { DebugReadout } from './ui/DebugReadout';
import { Header } from './ui/Header';
import { MotionToggle } from './ui/MotionToggle';

const SECTION_IDS: readonly SectionId[] = [...site.nav.map((n) => n.id), 'start'];

export function App() {
  const { reduced, switches } = useMotion();
  const active = useActiveSection(SECTION_IDS);
  useRevealObservers();

  useEffect(() => installPointerTracking(), []);
  useEffect(() => {
    const current = { reduced };
    return installHashNavigation(() => current.reduced);
  }, [reduced]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header active={active} />
      <main id="main" tabIndex={-1}>
        <Story />
        <Work />
        <Services />
        <Lab />
        <Studio />
        <StartProject />
      </main>
      <Footer />
      <MotionToggle />
      {switches.debug && <DebugReadout />}
    </>
  );
}
