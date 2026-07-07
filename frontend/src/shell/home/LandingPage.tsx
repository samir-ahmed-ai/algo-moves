import { useMemo, useState } from 'react';
import { catalog, type TrackId } from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { readLastItemId, useWorkspace } from '@/store/workspace';
import { buildWorkspaceEntryUrl } from '@/store/navigation';
import { useIsMobile, useMediaQuery } from '@/lib/utils/useMediaQuery';
import { trackGroups } from './landingFeatureGroups';
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
    themePreset,
    dir,
    enterMobile,
    enterVim,
    enterGames,
    enterPlans,
    enterResumes,
  } = useWorkspace();
  const isMobile = useIsMobile();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const progress = useProgress();

  const problems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);

  const totals = useMemo(() => {
    const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
    const attempted = problems.filter((i) => statFor(progress, i.id).attempts > 0).length;
    const bestStreak = problems.reduce(
      (m, i) => Math.max(m, statFor(progress, i.id).bestStreak),
      0,
    );
    return { mastered, attempted, bestStreak };
  }, [problems, progress]);

  const goConceptCount = useMemo(
    () => catalog.items.filter((i) => i.pluginId?.startsWith('go-')).length,
    [],
  );
  const openrtbConceptCount = useMemo(
    () => catalog.items.filter((i) => i.pluginId?.startsWith('ortb-')).length,
    [],
  );
  const prepProblemCount = useMemo(
    () => problems.filter((i) => i.id.startsWith('prep-')).length,
    [problems],
  );

  const [lastId] = useState(() => readLastItemId());
  const lastItem = lastId ? catalog.getItem(lastId) : undefined;
  const firstProblem = problems[0];

  const [exploreId, setExploreId] = useState('');
  const [lastTrackId, setLastTrackId] = useState<TrackId>('go');

  const handleExplore = (id: string) => {
    setExploreId(id);
    if (id === 'swipe') enterMobile();
    else if (id === 'games') enterGames();
    else if (id === 'vim') enterVim();
    else if (id === 'plans') enterPlans();
    else if (id === 'resumes') enterResumes();
  };

  const specializedTrackGroups = useMemo(
    () => trackGroups(goConceptCount, openrtbConceptCount, prepProblemCount),
    [goConceptCount, openrtbConceptCount, prepProblemCount],
  );

  const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const wsUrl = useMemo(
    () => ({
      canvas: () => buildWorkspaceEntryUrl({ theme, palette, themePreset, dir }),
      problem: (itemId: string, mode = 'learn') =>
        buildWorkspaceEntryUrl({ itemId, mode, theme, palette, themePreset, dir }),
      track: (trackId: TrackId) =>
        buildWorkspaceEntryUrl({ trackId, theme, palette, themePreset, dir }),
    }),
    [theme, palette, themePreset, dir],
  );

  const openItem = (id: string) => openInNewTab(wsUrl.problem(id));
  const browseTrack = (trackId: TrackId) => openInNewTab(wsUrl.track(trackId));
  const startIn = (mode: 'play' | 'visualize' | 'learn') => {
    if (mode === 'visualize') return openInNewTab(wsUrl.canvas());
    if (firstProblem) openInNewTab(wsUrl.problem(firstProblem.id, mode));
  };

  const onTrackPick = (id: TrackId) => {
    setLastTrackId(id);
    browseTrack(id);
  };

  return (
    <div data-density={density} className="ws-scroll h-full w-full overflow-y-auto bg-bg text-ink">
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
        <aside className="relative border-b border-edge lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:[scrollbar-gutter:stable]">
          <div
            aria-hidden
            className="landing-hero-glow pointer-events-none absolute inset-0 opacity-60"
          />
          <div className="relative flex min-h-full flex-col gap-[var(--gap)] px-[var(--hpad)] py-[var(--pad)] sm:gap-2 sm:px-6 sm:py-4">
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
              onGames={enterGames}
            />
            <LandingCatalogRail
              problems={problems}
              totals={totals}
              isDesktop={isDesktop}
              specializedTrackGroups={specializedTrackGroups}
              lastTrackId={lastTrackId}
              onTrackPick={onTrackPick}
            />
          </div>
        </aside>

        <LandingCatalogRoadmap
          problems={problems}
          prepProblemCount={prepProblemCount}
          goConceptCount={goConceptCount}
          openrtbConceptCount={openrtbConceptCount}
          onInterviewPrep={() => browseTrack('interview-prep')}
          onProblems={() => startIn('play')}
          onGo={() => browseTrack('go')}
          onOpenrtb={() => browseTrack('openrtb')}
          onLearn={() => startIn('learn')}
          onVisualize={() => startIn('visualize')}
          onVim={enterVim}
          onGames={enterGames}
        />
      </div>
    </div>
  );
}
