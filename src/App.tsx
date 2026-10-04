import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { caseBySlug } from './content/cases';
import { type SectionId } from './content/site';
import { useActiveSection, useRevealObservers } from './hooks/useViewportObservers';
import { installPointerTracking } from './lib/liveState';
import { useMotion } from './motion/MotionProvider';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PageLoading } from './pages/PageLoading';
import { PrivacyPage } from './pages/PrivacyPage';
import { RouterProvider, useRouter } from './router/Router';
import { routeKey, routeTitle, type Route } from './router/routes';
import { Footer } from './sections/Footer';
import { DebugReadout } from './ui/DebugReadout';
import { Header } from './ui/Header';

const CasePage = lazy(() => import('./pages/CasePage'));
const StartProjectPage = lazy(() => import('./pages/StartProjectPage'));

const HOME_SECTIONS: readonly SectionId[] = ['work', 'services', 'lab', 'process', 'studio', 'start'];
const NO_SECTIONS: readonly SectionId[] = [];

const titleFor = (route: Route) => routeTitle(route, (slug) => caseBySlug(slug).title);

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'case':
      return (
        <Suspense fallback={<PageLoading />}>
          <CasePage slug={route.slug} />
        </Suspense>
      );
    case 'start':
      return (
        <Suspense fallback={<PageLoading />}>
          <StartProjectPage />
        </Suspense>
      );
    case 'privacy':
      return <PrivacyPage />;
    case 'notFound':
      return <NotFoundPage path={route.path} />;
  }
}

function Shell() {
  const { switches } = useMotion();
  const { route } = useRouter();
  const key = routeKey(route);
  const homeActive = useActiveSection(route.name === 'home' ? HOME_SECTIONS : NO_SECTIONS, key);
  const active: SectionId | null = route.name === 'case' ? 'work' : route.name === 'start' ? 'start' : homeActive;
  useRevealObservers();
  useEffect(() => installPointerTracking(), []);
  useEffect(() => {
    document.documentElement.dataset.route = route.name;
  }, [route.name]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header active={active} />
      <main id="main" tabIndex={-1} data-route={route.name}>
        <RouteView key={key} route={route} />
      </main>
      <Footer />
      {switches.debug && <DebugReadout />}
    </>
  );
}

export function App() {
  const { reduced } = useMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const isReduced = useMemo(() => () => reducedRef.current, []);
  return (
    <RouterProvider isReduced={isReduced} titleFor={titleFor}>
      <Shell />
    </RouterProvider>
  );
}
