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
    enterPlans,
    enterResumes,
    enterCollabCanvas,
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
    else if (id === 'plans') enterPlans();
    else if (id === 'resumes') enterResumes();
    else if (id === 'interview-canvas') enterCollabCanvas();
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
      className="ws-scroll landing-shell h-full w-full overflow-y-auto text-ink"
    >
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
        <aside className="landing-hero-panel relative border-b border-edge lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:[scrollbar-gutter:stable]">
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
              onPlans={enterPlans}
              onResumes={enterResumes}
              onInterviewCanvas={enterCollabCanvas}
            />
            <LandingCatalogRail onVim={enterVim} />
          </div>
        </aside>

        <LandingCatalogRoadmap onOpenProblem={openProblem} onOpenTrack={browseTrack} />
      </div>
    </div>
  );
}
