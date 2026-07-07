import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Contrast,
  Eye,
  Flame,
  Gamepad2,
  GraduationCap,
  Keyboard,
  LayoutGrid,
  Megaphone,
  Moon,
  Play,
  Smartphone,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
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

function IconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-xl border transition-colors [&>svg]:h-4 [&>svg]:w-4',
        active
          ? 'border-accent bg-accentbg text-accent'
          : 'border-edge text-ink3 hover:bg-panel2 hover:text-ink',
      )}
    >
      {children}
    </button>
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

function RailTrack({
  icon,
  title,
  meta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-edge bg-panel/60 px-3 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-panel"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink3">{meta}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </button>
  );
}

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
  const pills = [
    { icon: Play, label: 'Play', onClick: onPlay },
    { icon: Eye, label: 'Visualize', onClick: onVisualize },
    { icon: GraduationCap, label: 'Learn', onClick: onLearn },
    { icon: Smartphone, label: 'Swipe', onClick: onSwipe },
    { icon: Keyboard, label: 'Vim Dojo', onClick: onVim },
    { icon: Gamepad2, label: 'Games', onClick: onGames },
  ] as const;

  return (
    <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-min gap-2 px-1">
        {pills.map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-edge bg-panel/60 px-3 py-2 text-sm text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
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

  return (
    <div
      data-density={density}
      className="ws-scroll h-full w-full overflow-y-auto bg-bg text-ink"
    >
      {/* mobile sticky header */}
      <header className="sticky top-0 z-30 border-b border-edge bg-bg/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <EagleMark className="h-8 w-8 shrink-0 rounded-lg shadow-[var(--shadow-md)]" />
          <span className="min-w-0 truncate font-semibold tracking-tight">Algo Moves</span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <IconButton title="Swipe mode" onClick={() => enterMobile()}>
              <Smartphone />
            </IconButton>
            <IconButton title="Games" onClick={() => enterGames()}>
              <Gamepad2 />
            </IconButton>
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(440px,1fr)_minmax(280px,480px)]">
        {/* ---------------------------------------------------------- left rail */}
        <aside className="relative border-b border-edge lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:[scrollbar-gutter:stable]">
          <div aria-hidden className="landing-hero-glow pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex min-h-full flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
            {/* brand + controls — desktop only */}
            <div className="hidden items-center gap-2 lg:flex">
              <EagleMark className="h-9 w-9 rounded-xl shadow-[var(--shadow-md)]" />
              <span className="font-semibold tracking-tight">Algo Moves</span>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <IconButton title="Swipe mode — mobile practice deck" onClick={() => enterMobile()}>
                  <Smartphone />
                </IconButton>
                <IconButton title="Games — two-player rooms" onClick={() => enterGames()}>
                  <Gamepad2 />
                </IconButton>
                <IconButton
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun /> : <Moon />}
                </IconButton>
                <IconButton
                  title={palette === 'cb' ? 'Colour-blind palette: on' : 'Colour-blind palette: off'}
                  active={palette === 'cb'}
                  onClick={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
                >
                  <Contrast />
                </IconButton>
                <AuthButton />
              </div>
            </div>

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

            {/* primary CTAs */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
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
              <button
                type="button"
                onClick={() =>
                  document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-accent/40 bg-accentbg/40 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent/60 lg:hidden"
              >
                <Target className="h-4 w-4" />
                Explore roadmap
              </button>
            </div>

            {/* theme row — mobile only */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <IconButton
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun /> : <Moon />}
              </IconButton>
              <IconButton
                title={palette === 'cb' ? 'Colour-blind palette: on' : 'Colour-blind palette: off'}
                active={palette === 'cb'}
                onClick={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
              >
                <Contrast />
              </IconButton>
            </div>

            {/* mode pills */}
            <ModeStrip
              onPlay={() => startIn('play')}
              onVisualize={() => startIn('visualize')}
              onLearn={() => startIn('learn')}
              onSwipe={() => enterMobile()}
              onVim={() => enterVim()}
              onGames={() => enterGames()}
            />

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
              <div className="flex flex-col gap-2">
                <RailTrack
                  icon={<Code2 />}
                  title="Go — Senior Developer"
                  meta={`${goConceptCount} concepts · concurrency, memory, generics`}
                  onClick={() => browseTrack('go')}
                />
                <RailTrack
                  icon={<Megaphone />}
                  title="OpenRTB & Ad Platforms"
                  meta={`${openrtbConceptCount} concepts · bidder, exchange, privacy`}
                  onClick={() => browseTrack('openrtb')}
                />
                <RailTrack
                  icon={<Target />}
                  title="Interview Preparation"
                  meta={`${prepProblemCount} hand-authored problems`}
                  onClick={() => browseTrack('interview-prep')}
                />
              </div>
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
