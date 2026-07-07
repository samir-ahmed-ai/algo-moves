import { useMemo, useState } from 'react';
import { catalog, type TrackId } from '../../content';
import { useProgress } from '@/store/persistence';
import { readLastItemId, useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { LandingToolbar } from './LandingToolbar';
import { LandingHero } from './LandingHero';
import { LandingCatalogRail, LandingCatalogRoadmap } from './LandingCatalog';

export function LandingPage() {
  const {
    theme,
    setTheme,
    palette,
    setPalette,
    density,
    enterWorkspace,
    enterCanvas,
    enterProblemInMode,
    setActiveTrackId,
    setActiveCategoryId,
    setProblemFocused,
    enterMobile,
    enterVim,
    enterDojo,
    enterGames,
  } = useWorkspace();
  const isMobile = useIsMobile();
  const progress = useProgress();

  const problems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);

  const [lastId] = useState(() => readLastItemId());
  const lastItem = lastId ? catalog.getItem(lastId) : undefined;
  const firstProblem = problems[0];

  const [exploreId, setExploreId] = useState('');

  const handleExplore = (id: string) => {
    setExploreId(id);
    if (id === 'swipe') enterMobile();
    else if (id === 'games') enterGames();
    else if (id === 'vim') enterVim();
    else if (id === 'dojo') enterDojo();
  };

  const openItem = (id: string) => enterWorkspace(id);
  const browseTrack = (trackId: TrackId) => {
    setActiveTrackId(trackId);
    setActiveCategoryId(null);
    setProblemFocused(false);
    enterWorkspace();
  };
  const openProblem = (id: string, mode: 'learn' | 'visualize') => enterProblemInMode(id, mode);
  const startIn = (mode: 'play' | 'visualize' | 'learn') => {
    if (mode === 'visualize') {
      enterCanvas();
      return;
    }
    if (firstProblem) enterProblemInMode(firstProblem.id, mode);
  };

  return (
    <div
      data-density={density}
      data-surface="landing"
      className="ws-scroll landing-shell relative isolate h-full w-full overflow-y-auto text-ink"
    >
      <a
        href="#landing-roadmap"
        className="sr-only fixed left-4 top-4 z-50 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-theme-md focus:not-sr-only"
      >
        Skip to roadmap
      </a>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_8%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_28rem),radial-gradient(circle_at_88%_0%,rgba(248,214,121,0.12),transparent_26rem)]"
      />
      <LandingToolbar
        lastItem={lastItem}
        firstProblem={firstProblem}
        onOpenItem={openItem}
        onStartIn={startIn}
        exploreId={exploreId}
        onExplore={handleExplore}
        theme={theme}
        setTheme={setTheme}
        palette={palette}
        setPalette={setPalette}
        onOpenDevice={enterMobile}
      />

      <div className="lg:grid lg:grid-cols-[minmax(440px,1fr)_minmax(280px,480px)]">
        <aside
          aria-label="Algo Moves introduction and quick actions"
          className="landing-hero-panel relative border-b border-edge lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:[scrollbar-gutter:stable]"
        >
          <div
            aria-hidden
            className="landing-hero-glow pointer-events-none absolute inset-0 opacity-60"
          />
          <div className="relative flex min-h-full flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-5">
            <LandingHero
              problems={problems}
              lastItem={lastItem}
              firstProblem={firstProblem}
              progress={progress}
              isMobile={isMobile}
              onOpenItem={openItem}
              onBrowseTrack={() => browseTrack('interview-prep')}
              onStartIn={startIn}
              onSwipe={enterMobile}
              onVim={enterVim}
              onDojo={enterDojo}
              onGames={enterGames}
            />
            <LandingCatalogRail onVim={enterVim} />
          </div>
        </aside>

        <section
          id="landing-roadmap"
          aria-label="Algorithm roadmap"
          className="relative z-10 scroll-mt-4"
        >
          <LandingCatalogRoadmap onOpenProblem={openProblem} onOpenTrack={browseTrack} />
        </section>
      </div>
    </div>
  );
}
