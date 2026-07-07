import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Contrast,
  Eye,
  Flame,
  GraduationCap,
  LayoutGrid,
  Moon,
  MoreHorizontal,
  Play,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import { FeatureSelectorPopover, ToolbarSegment } from '@/components/shared';
import {
  EXPLORE_GROUPS,
  MORE_MODES_GROUPS,
  PALETTE_GROUPS,
  THEME_GROUPS,
  trackGroups,
} from './landingFeatureGroups';
import {
  catalog,
  getAllCategories,
  getTracks,
  browseBreadcrumbForItem,
  type TrackId,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { readLastItemId, useWorkspace } from '@/store/workspace';
import { buildWorkspaceEntryUrl } from '@/store/navigation';
import { useIsMobile, useMediaQuery } from '@/lib/utils/useMediaQuery';
import { compactLabel } from '../chromeUi';
import { cn } from '@/lib/utils/cn';
import { EagleMark } from '@/shell/EagleMark';
import { AuthButton } from '@/shell/auth';
import { glyphFor } from '../../content/problemShape';
import { Chip } from '@/design/components';
import { RoadmapCanvas } from './RoadmapCanvas';
import { SwipeModeQrPromo } from './SwipeModeQrPromo';
import { VimHeroPreview } from '@/shell/vim/ui/VimHeroPreview';

/* ----------------------------------------------------------------- helpers */

/** Inner-SVG mnemonic glyph, drawn the same way the topic board draws it. */
function Glyph({ markup, className }: { markup: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function RailStat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-panel/60 px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-panel2 text-accent [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-base font-semibold tabular-nums leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-[10px] uppercase tracking-wide text-ink3">{label}</div>
      </div>
    </div>
  );
}

const MODE_PILL =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-edge bg-panel/60 px-3 py-2 text-sm text-ink2 transition-colors hover:border-accent/50 hover:text-ink';

const HEADER_BTN_PRIMARY =
  'inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:gap-1.5 sm:px-3 sm:text-sm';

const HEADER_MODE_BTN =
  'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink2 transition-colors hover:bg-panel2 hover:text-ink sm:gap-1.5 sm:px-2.5 sm:text-sm';

function ModeStrip({
  onPlay,
  onVisualize,
  onLearn,
  onSwipe,
  onVim,
  onGames,
}: {
  onPlay: () => void;
  onVisualize: () => void;
  onLearn: () => void;
  onSwipe: () => void;
  onVim: () => void;
  onGames: () => void;
}) {
  const [moreMode, setMoreMode] = useState('');

  const primaryPills = [
    { icon: Play, label: 'Play', onClick: onPlay },
    { icon: Eye, label: 'Visualize', onClick: onVisualize },
    { icon: GraduationCap, label: 'Learn', onClick: onLearn },
  ] as const;

  const handleMoreMode = (id: string) => {
    setMoreMode(id);
    if (id === 'swipe') onSwipe();
    else if (id === 'vim') onVim();
    else if (id === 'games') onGames();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="-mx-1 min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-min gap-2 px-1">
          {primaryPills.map(({ icon: Icon, label, onClick }) => (
            <button key={label} type="button" onClick={onClick} className={MODE_PILL}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <FeatureSelectorPopover
        groups={MORE_MODES_GROUPS}
        value={moreMode}
        onChange={handleMoreMode}
        panelTitle="More modes"
        panelHint="Swipe, Vim, games"
        triggerLabel="More"
        triggerIcon={<MoreHorizontal className="h-3.5 w-3.5" />}
        triggerClassName={MODE_PILL}
        menu
        align="right"
      />
    </div>
  );
}

function RailDetails({
  title,
  children,
  forceOpen,
}: {
  title: string;
  children: ReactNode;
  forceOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-edge bg-panel/40 open:bg-panel/60 lg:border-0 lg:bg-transparent lg:open:bg-transparent [&_summary::-webkit-details-marker]:hidden"
      open={forceOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink3 transition-colors hover:text-ink lg:hidden">
        <span>{title}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-1 pb-3 pt-1 lg:contents">{children}</div>
    </details>
  );
}

/* ----------------------------------------------------------------- makers */

interface Maker {
  name: string;
  role: string;
  photo?: string;
  email?: string;
}

const MAKER: Maker = {
  name: 'Ahmed Abdelmaaboud',
  role: 'Creator & Senior Go Engineer',
  photo: `${import.meta.env.BASE_URL}assets/ahmed.png`,
  email: 'ahmed.amer.samir@gmail.com',
};

const MBM_WORDS = ['move', 'by', 'move.'] as const;

/** Hero tagline tail — flowing wave underline with staggered word bob. */
function MoveByMoveAnimated({ className }: { className?: string }) {
  return (
    <span className={cn('hero-mbm', className)} aria-label="move by move.">
      {MBM_WORDS.map((word, step) => (
        <span key={word} className="hero-mbm__word" style={{ '--step': step } as CSSProperties}>
          <span className="hero-mbm__wave-char">{word}</span>
        </span>
      ))}
      <span className="hero-mbm__wave" aria-hidden>
        <svg viewBox="0 0 200 8" preserveAspectRatio="none">
          <path
            className="hero-mbm__wave-path"
            d="M0 4 C25 0 25 8 50 4 C75 0 75 8 100 4 C125 0 125 8 150 4 C175 0 175 8 200 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
    </span>
  );
}

/* ----------------------------------------------------------------- landing */

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
  } = useWorkspace();
  const isMobile = useIsMobile();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const progress = useProgress();

  const problems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);

  const totals = useMemo(() => {
    const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
    const attempted = problems.filter((i) => statFor(progress, i.id).attempts > 0).length;
    const bestStreak = problems.reduce((m, i) => Math.max(m, statFor(progress, i.id).bestStreak), 0);
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

  const openCanvas = () => openInNewTab(wsUrl.canvas());
  const openItem = (id: string) => openInNewTab(wsUrl.problem(id));
  const browseTrack = (trackId: TrackId) => openInNewTab(wsUrl.track(trackId));
  const startIn = (mode: 'play' | 'visualize' | 'learn') => {
    if (mode === 'visualize') return openCanvas();
    if (firstProblem) openInNewTab(wsUrl.problem(firstProblem.id, mode));
  };

  const lastBrowseCrumb = lastItem ? browseBreadcrumbForItem(lastItem.id, catalog) : undefined;

  const headerModes = [
    { icon: Play, label: 'Play', title: 'Play mode', onClick: () => startIn('play') },
    { icon: Eye, label: 'Visualize', title: 'Visualize mode', onClick: () => startIn('visualize') },
    { icon: GraduationCap, label: 'Learn', title: 'Learn mode', onClick: () => startIn('learn') },
  ] as const;

  return (
    <div
      data-density={density}
      className="ws-scroll h-full w-full overflow-y-auto bg-bg text-ink"
    >
      {/* sticky header — all breakpoints */}
      <header className="sticky top-0 z-30 border-b border-edge bg-bg/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-2.5 sm:px-6">
          <EagleMark className="h-8 w-8 shrink-0 rounded-lg shadow-[var(--shadow-md)] lg:h-9 lg:w-9 lg:rounded-xl" />
          <span className="min-w-0 truncate font-semibold tracking-tight">Algo Moves</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => openItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
              className={HEADER_BTN_PRIMARY}
              title={lastItem ? 'Resume learning' : 'Start learning'}
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lastItem ? 'Resume' : 'Start'}</span>
            </button>
            <ToolbarSegment className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {headerModes.map(({ icon: Icon, label, title, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className={HEADER_MODE_BTN}
                  title={title}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
            </ToolbarSegment>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ToolbarSegment>
              <FeatureSelectorPopover
                groups={EXPLORE_GROUPS}
                value={exploreId}
                onChange={handleExplore}
                panelTitle="Explore modes"
                panelHint="Swipe, Vim, games, plans"
                triggerIcon={<MoreHorizontal className="h-3.5 w-3.5" />}
                triggerAriaLabel="Explore modes"
                compact
                align="right"
              />
              <FeatureSelectorPopover
                groups={THEME_GROUPS}
                value={theme}
                onChange={(v) => setTheme(v as 'light' | 'dark')}
                panelTitle="Theme"
                triggerIcon={theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                triggerAriaLabel="Theme"
                compact
                align="right"
              />
              <FeatureSelectorPopover
                groups={PALETTE_GROUPS}
                value={palette}
                onChange={(v) => setPalette(v as 'default' | 'cb')}
                panelTitle="Colour palette"
                triggerIcon={<Contrast className="h-3.5 w-3.5" />}
                triggerAriaLabel="Colour palette"
                compact
                align="right"
              />
            </ToolbarSegment>
            <div className="hidden lg:block">
              <SwipeModeQrPromo onOpenDevice={enterMobile} />
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(440px,1fr)_minmax(280px,480px)]">
        {/* ---------------------------------------------------------- left rail */}
        <aside className="relative border-b border-edge lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:[scrollbar-gutter:stable]">
          <div aria-hidden className="landing-hero-glow pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex min-h-full flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
            {/* hero copy */}
            <div className="@container">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Interview prep
              </p>
              <h1 className="hero-headline font-semibold leading-[1.1] tracking-tight text-ink">
                Algorithms <MoveByMoveAnimated className="text-[0.72em] font-semibold" />
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink2 sm:mt-3">
                {problems.length}+ interview problems as step-by-step replays — visualize, learn, and
                drill until they stick.
              </p>
            </div>

            {/* primary CTAs — desktop left rail; sticky header covers sub-lg */}
            <div className="hidden flex-col gap-2 lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5">
              <button
                type="button"
                onClick={() => openItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:py-2.5"
              >
                <Play className="h-4 w-4" />
                {lastItem
                  ? compactLabel('Resume learning', 'Resume', isMobile)
                  : compactLabel('Start learning', 'Start', isMobile)}
              </button>
              <button
                type="button"
                onClick={() => browseTrack('interview-prep')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-edge bg-panel/60 px-4 py-3 font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-ink sm:w-auto sm:py-2.5"
              >
                <BookOpen className="h-4 w-4" />
                {compactLabel('Browse tracks', 'Browse', isMobile)}
              </button>
            </div>

            {/* mode pills — desktop left rail only; sticky header covers sub-lg */}
            <div className="hidden lg:block">
              <ModeStrip
                onPlay={() => startIn('play')}
                onVisualize={() => startIn('visualize')}
                onLearn={() => startIn('learn')}
                onSwipe={() => enterMobile()}
                onVim={() => enterVim()}
                onGames={() => enterGames()}
              />
            </div>

            {/* Vim Dojo promo — desktop left rail */}
            <div className="hidden items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3 lg:flex">
              <VimHeroPreview />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Vim Dojo</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink3">
                  Timed keyboard drills for motions, editing, and muscle memory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => enterVim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-edge bg-panel2 px-3 py-2 text-xs font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-accent"
              >
                Open dojo
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* continue where you left off */}
            {lastItem ? (
              <button
                type="button"
                onClick={() => openItem(lastItem.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-ink2">
                  {glyphFor(lastItem) ? (
                    <Glyph
                      markup={glyphFor(lastItem)!}
                      className="h-6 w-6 transition-colors group-hover:text-accent"
                    />
                  ) : (
                    <LayoutGrid className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-ink">{lastItem.title}</span>
                    {lastItem.difficulty && (
                      <Chip
                        tone={
                          lastItem.difficulty === 'Easy'
                            ? 'good'
                            : lastItem.difficulty === 'Hard'
                              ? 'bad'
                              : 'accent'
                        }
                      >
                        {lastItem.difficulty}
                      </Chip>
                    )}
                    {statFor(progress, lastItem.id).mastered && (
                      <Trophy className="h-3.5 w-3.5 text-good" aria-label="mastered" />
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink3">
                    Continue · {lastBrowseCrumb?.track?.title}
                    {lastBrowseCrumb?.category ? ` › ${lastBrowseCrumb.category.title}` : ''}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}

            {/* stats */}
            <RailDetails title="Your library" forceOpen={isDesktop}>
              <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink3 lg:block">
                Your library
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                <RailStat icon={<BookOpen />} value={getTracks().length} label="Tracks" />
                <RailStat icon={<LayoutGrid />} value={getAllCategories().length} label="Categories" />
                <RailStat icon={<Code2 />} value={problems.length} label="Problems" />
                <RailStat icon={<Target />} value={totals.attempted} label="Attempted" />
                <RailStat icon={<Trophy />} value={totals.mastered} label="Mastered" />
                <RailStat icon={<Flame />} value={totals.bestStreak} label="Best streak" />
              </div>
            </RailDetails>

            {/* spotlight tracks */}
            <RailDetails title="Specialized tracks" forceOpen={isDesktop}>
              <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink3 lg:block">
                Specialized tracks
              </p>
              <FeatureSelectorPopover
                groups={specializedTrackGroups}
                value={lastTrackId}
                onChange={(id) => {
                  setLastTrackId(id as TrackId);
                  browseTrack(id as TrackId);
                }}
                panelTitle="Browse a specialized track"
                panelHint="Opens new tab"
                triggerLabel="Track"
                align="left"
                className="w-full"
              />
            </RailDetails>

            {/* maker + footer — desktop only */}
            <div className="mt-auto hidden space-y-4 pt-2 lg:block">
              <div className="flex items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3">
                {MAKER.photo ? (
                  <img
                    src={MAKER.photo}
                    alt={MAKER.name}
                    className="h-12 w-12 shrink-0 rounded-xl border border-edge object-cover object-top"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                    {MAKER.role}
                  </p>
                  <p className="truncate text-sm font-semibold text-ink">{MAKER.name}</p>
                  {MAKER.email ? (
                    <a
                      href={`mailto:${MAKER.email}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-70"
                    >
                      {MAKER.email}
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-ink3">
                Algo Moves — step through interview algorithms until they stick.
              </p>
            </div>
          </div>
        </aside>

        {/* --------------------------------------------------------- right roadmap */}
        <main id="roadmap" className="relative scroll-mt-14 bg-panel/20 lg:scroll-mt-0">
          <div
            aria-hidden
            className="landing-hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50 sm:h-96"
          />
          <div className="relative border-b border-edge px-4 pt-5 text-center sm:px-6 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              The full system
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-2xl">
              Follow the roadmap, move by move
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm pb-3 text-sm leading-relaxed text-ink2 sm:pb-4">
              Every part of Algo Moves as one journey — from your first interview problem all the way
              to two-player games.
            </p>
          </div>
          <RoadmapCanvas
            prepProblemCount={prepProblemCount}
            problemsCount={problems.length}
            goConceptCount={goConceptCount}
            openrtbConceptCount={openrtbConceptCount}
            onInterviewPrep={() => browseTrack('interview-prep')}
            onProblems={() => startIn('play')}
            onGo={() => browseTrack('go')}
            onOpenrtb={() => browseTrack('openrtb')}
            onLearn={() => startIn('learn')}
            onVisualize={() => startIn('visualize')}
            onVim={() => enterVim()}
            onGames={() => enterGames()}
          />
        </main>
      </div>
    </div>
  );
}
