import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Code2,
  Contrast,
  Eye,
  Flame,
  Gamepad2,
  GraduationCap,
  Keyboard,
  LayoutGrid,
  Moon,
  Play,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import { catalog, getAllCategories, getTracks, browseBreadcrumbForItem, type Item, type TrackId } from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { readLastItemId, useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { compactLabel } from '../chromeUi';
import { cn } from '@/lib/utils/cn';
import { SwipeModeQrPromo } from './SwipeModeQrPromo';
import { glyphFor } from '../../content/problemShape';
import { Chip } from '../canvas/nodeui';
import { TrackGrid } from '../browse/TrackGrid';
import { VimHeroPreview } from '../vim/ui/VimHeroPreview';

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

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

/* ------------------------------------------------------------------ pieces */

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
        'grid h-8 w-8 place-items-center rounded-md border transition-colors [&>svg]:h-4 [&>svg]:w-4',
        active
          ? 'border-accent bg-accentbg text-accent'
          : 'border-edge text-ink3 hover:bg-panel2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Header dropdown grouping the extra play modes — Vim Dojo, then Games. */
function PlayMenu({ onVim, onGames }: { onVim: () => void; onGames: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Play"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
          open
            ? 'border-accent/60 bg-accentbg text-accent'
            : 'border-edge text-ink2 hover:border-accent/50 hover:text-ink',
        )}
      >
        <Gamepad2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Play</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1.5 w-48 overflow-hidden rounded-lg border border-edge bg-panel p-1 shadow-[var(--shadow-lg)]"
          >
            <PlayMenuItem icon={<Keyboard className="h-4 w-4" />} title="Vim Dojo" hint="Keyboard maze trainer" onClick={() => pick(onVim)} />
            <PlayMenuItem icon={<Gamepad2 className="h-4 w-4" />} title="Games" hint="Two-player games" onClick={() => pick(onGames)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlayMenuItem({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-panel2"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accentbg text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink3">{hint}</span>
      </span>
    </button>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-[var(--radius)] border border-edge bg-panel/60 px-4 py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-panel2 text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xl font-semibold tabular-nums leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-xs uppercase tracking-wide text-ink3">{label}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col items-start gap-2 rounded-[var(--radius)] border border-edge bg-panel/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-accentbg text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <span className="mt-1 font-semibold text-ink">{title}</span>
      <span className="text-sm leading-snug text-ink2">{body}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-accent">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/** A small framed preview of the workspace, built from real problem glyphs. */
function WorkspacePreview({ featured }: { featured: Item[] }) {
  const nodes = featured.slice(0, 3);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[var(--radius)] border border-edge bg-panel/70 shadow-[var(--shadow-xl)] backdrop-blur">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
          <span className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: 'var(--edge-active)' }} />
          <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        </span>
        <span className="ml-1 flex items-center gap-1.5 font-mono text-xs text-ink3">
          <Eye className="h-3 w-3" /> {nodes[0]?.title ?? 'Algorithm'} · Visualize
        </span>
      </div>
      <div
        className="relative grid flex-1 grid-cols-3 gap-3 p-4 sm:p-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--edge) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      >
        {nodes.map((item, i) => {
          const markup = glyphFor(item);
          return (
            <div
              key={item.id}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-md border border-edge bg-panel px-2 py-3',
                i === 1 && 'border-accent/60 shadow-[0_0_0_1px_var(--accent-bg)]',
              )}
            >
              <span className="absolute -top-1.5 left-2 font-mono text-[9px] text-ink3">{i + 1}</span>
              {markup ? (
                <Glyph markup={markup} className="h-8 w-8 text-ink2" />
              ) : (
                <LayoutGrid className="h-8 w-8 text-ink3" />
              )}
              <span className="line-clamp-1 text-center text-[11px] leading-tight text-ink3">{item.title}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-edge px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <span className="truncate font-mono text-xs text-ink3">
          step 3 / 12 · coloring node {nodes[1]?.title ? '→ team B' : ''}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- landing */

const MBM_WORDS = ['move', 'by', 'move.'] as const;

const LANDING_INNER = 'mx-auto max-w-6xl px-5 sm:px-8';
const LANDING_SECTION_Y = 'py-12 sm:py-14 lg:py-16';

function LandingSection({
  id,
  tone = 'default',
  bordered = true,
  className,
  children,
}: {
  id?: string;
  tone?: 'default' | 'muted';
  bordered?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        tone === 'muted' && 'bg-panel/30',
        bordered && 'border-b border-edge',
        className,
      )}
    >
      <div className={cn(LANDING_INNER, LANDING_SECTION_Y)}>{children}</div>
    </section>
  );
}

function LandingSplit({
  reverse = false,
  className,
  children,
}: {
  reverse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16',
        reverse && '[&>*:first-child]:lg:order-2 [&>*:last-child]:lg:order-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SplitCopy({
  eyebrow,
  title,
  description,
  children,
  as = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  as?: 'h1' | 'h2';
}) {
  const Heading = as;
  return (
    <div className="@container flex min-w-0 flex-col justify-center">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <Heading
        className={cn(
          'font-semibold tracking-tight text-ink',
          as === 'h1'
            ? 'hero-headline whitespace-nowrap leading-[1.1]'
            : 'text-2xl leading-tight sm:text-3xl',
        )}
      >
        {title}
      </Heading>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink2 sm:text-base">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function SplitMedia({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center justify-center', className)}>{children}</div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'start';
}) {
  return (
    <div className={cn('mb-8 lg:mb-10', align === 'center' ? 'text-center' : 'text-left')}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {description ? (
        <p
          className={cn(
            'mt-3 text-sm leading-relaxed text-ink2 sm:text-base',
            align === 'center' && 'mx-auto max-w-2xl',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

const FRAMED_MEDIA =
  'w-full rounded-[var(--radius)] border border-edge bg-panel/60 shadow-[var(--shadow-md)]';

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
            d="M0 4 C25 0 25 8 50 4 S75 0 75 8 100 4 125 0 125 8 150 4 175 0 175 8 200 4"
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
    enterMobile,
    enterVim,
    enterGames,
    setActiveTrackId,
    setActiveCategoryId,
    setProblemFocused,
  } = useWorkspace();
  const isMobile = useIsMobile();
  const progress = useProgress();

  const problems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);
  const featured = useMemo(() => {
    const picks: Item[] = [];
    for (const item of catalog.items) {
      if (item.pluginId && glyphFor(item)) {
        picks.push(item);
        if (picks.length >= 6) break;
      }
    }
    return picks;
  }, []);

  const totals = useMemo(() => {
    const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
    const attempted = problems.filter((i) => statFor(progress, i.id).attempts > 0).length;
    const bestStreak = problems.reduce((m, i) => Math.max(m, statFor(progress, i.id).bestStreak), 0);
    return { mastered, attempted, bestStreak };
  }, [problems, progress]);

  const [lastId] = useState(() => readLastItemId());
  const lastItem = lastId ? catalog.getItem(lastId) : undefined;
  const firstProblem = problems[0];

  const openItem = (id: string) => enterWorkspace(id);
  const browseTrack = (trackId: TrackId) => {
    setActiveTrackId(trackId);
    setActiveCategoryId(null);
    setProblemFocused(false);
    enterWorkspace();
  };
  const startIn = (mode: 'play' | 'visualize' | 'learn') => {
    if (mode === 'visualize') {
      enterCanvas();
      return;
    }
    if (firstProblem) enterProblemInMode(firstProblem.id, mode);
  };

  const lastBrowseCrumb = lastItem ? browseBreadcrumbForItem(lastItem.id, catalog) : undefined;

  return (
    <div data-density={density} className="ws-scroll h-full w-full overflow-y-auto bg-bg text-ink">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-edge bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Algo Moves</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {!isMobile && <SwipeModeQrPromo onOpenDevice={() => enterMobile()} />}
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
            <PlayMenu onVim={() => enterVim()} onGames={() => enterGames()} />
            <button
              type="button"
              title="Open workspace"
              onClick={() => enterWorkspace()}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {compactLabel('Open workspace', 'Open', isMobile)}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden className="landing-hero-glow pointer-events-none absolute inset-0 opacity-70" />
        <div className={cn('relative', LANDING_INNER, LANDING_SECTION_Y)}>
          <LandingSplit>
            <SplitCopy
              as="h1"
              eyebrow="Interview prep"
              title={
                <>
                  Algorithms{' '}
                  <MoveByMoveAnimated className="text-[0.72em] font-semibold" />
                </>
              }
              description={`${problems.length}+ interview problems as step-by-step replays — visualize, learn, and drill until they stick.`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  {lastItem
                    ? compactLabel('Resume learning', 'Resume', isMobile)
                    : compactLabel('Start learning', 'Start', isMobile)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-edge bg-panel/60 px-5 py-2.5 font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
                >
                  <BookOpen className="h-4 w-4" />
                  {compactLabel('Browse tracks', 'Browse', isMobile)}
                </button>
              </div>
            </SplitCopy>
            <SplitMedia>
              <WorkspacePreview featured={featured} />
            </SplitMedia>
          </LandingSplit>
        </div>
      </section>

      {/* philosophy */}
      <LandingSection tone="muted">
        <LandingSplit reverse>
          <SplitCopy
            eyebrow="Method"
            title="Learn like AI trains"
            description="Try, get feedback, repeat. Wrong answers restart the run — shuffle and streak until you master the pattern."
          />
          <SplitMedia>
            <img
              src={asset('learning-loop.svg')}
              alt="The learning loop: watch, quiz, restart on wrong, master"
              className={FRAMED_MEDIA}
              width={800}
              height={420}
              loading="lazy"
            />
          </SplitMedia>
        </LandingSplit>
      </LandingSection>

      {/* vim dojo — compact promo */}
      <LandingSection tone="muted" className="!py-8 sm:!py-10">
        <button
          type="button"
          onClick={() => enterVim()}
          className="group flex w-full items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)] sm:gap-5 sm:p-5"
        >
          <VimHeroPreview />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Keyboard mastery</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Vim Dojo</h2>
            <p className="mt-1.5 text-sm leading-snug text-ink2">
              Maze puzzles that teach h/j/k/l, words, finds, and jumps — no mouse.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
              Enter the Dojo
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </LandingSection>

      {/* games — two-player arcade promo */}
      <LandingSection className="!py-8 sm:!py-10">
        <button
          type="button"
          onClick={() => enterGames()}
          className="group flex w-full items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)] sm:gap-5 sm:p-5"
        >
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius)] border border-edge bg-accentbg sm:h-24 sm:w-24">
            <span className="grid grid-cols-2 gap-1.5 text-2xl leading-none">
              <span>🎯</span>
              <span>✊</span>
              <span>⚡</span>
              <span>🧠</span>
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Play together</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              <Gamepad2 className="h-5 w-5 text-accent" /> Two-player games
            </h2>
            <p className="mt-1.5 text-sm leading-snug text-ink2">
              Number Duel, Rock-Paper-Scissors, Tic-Tac-Toe and more — share a room code and play from two
              phones or iPads, in real time.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
              Start a room
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </LandingSection>

      {/* mobile preview */}
      <LandingSection>
        <LandingSplit>
          <SplitMedia>
            <img
              src={asset('mobile-swipe-deck.svg')}
              alt="Swipe mode mobile deck for algorithm drilling"
              className={cn(FRAMED_MEDIA, 'max-w-lg')}
              width={800}
              height={420}
              loading="lazy"
            />
          </SplitMedia>
          <SplitCopy
            eyebrow="Mobile"
            title="Drill on the go"
            description="Swipe through animate, quiz, and rebuild cards — built for quick reps between meetings or on the commute."
          >
            <button
              type="button"
              onClick={() => enterMobile()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
            >
              <Smartphone className="h-4 w-4" />
              Open Swipe mode
            </button>
          </SplitCopy>
        </LandingSplit>
      </LandingSection>

      <LandingSection>
        <SectionHeading
          eyebrow="Progress"
          title="Your library at a glance"
          description="Tracks, categories, and problems — plus how far you've pushed your streak."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:items-stretch lg:grid-cols-6">
          <StatCard icon={<BookOpen />} value={getTracks().length} label="Tracks" />
          <StatCard icon={<LayoutGrid />} value={getAllCategories().length} label="Categories" />
          <StatCard icon={<Code2 />} value={problems.length} label="Problems" />
          <StatCard icon={<Target />} value={totals.attempted} label="Attempted" />
          <StatCard icon={<Trophy />} value={totals.mastered} label="Mastered" />
          <StatCard icon={<Flame />} value={totals.bestStreak} label="Best streak" />
        </div>
      </LandingSection>

      {lastItem ? (
        <LandingSection tone="muted">
          <SectionHeading align="start" title="Continue where you left off" />
          <button
            type="button"
            onClick={() => openItem(lastItem.id)}
            className="group flex w-full items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)] sm:p-5"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-ink2">
              {glyphFor(lastItem) ? (
                <Glyph markup={glyphFor(lastItem)!} className="h-8 w-8 transition-colors group-hover:text-accent" />
              ) : (
                <LayoutGrid className="h-7 w-7" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-ink">{lastItem.title}</span>
                {lastItem.difficulty && (
                  <Chip tone={lastItem.difficulty === 'Easy' ? 'good' : lastItem.difficulty === 'Hard' ? 'bad' : 'accent'}>
                    {lastItem.difficulty}
                  </Chip>
                )}
                {statFor(progress, lastItem.id).mastered && (
                  <Trophy className="h-4 w-4 text-good" aria-label="mastered" />
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-ink3">
                {lastBrowseCrumb?.track?.title}
                {lastBrowseCrumb?.category ? ` › ${lastBrowseCrumb.category.title}` : ''}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
              Resume
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </LandingSection>
      ) : null}

      <LandingSection id="courses" className="scroll-mt-16">
        <SectionHeading
          eyebrow="Catalog"
          title="Browse by track"
          description="Pick Data Structures, Algorithms, Design, or browse everything in Interview Preparation."
        />
        <TrackGrid onPick={browseTrack} />
      </LandingSection>

      <LandingSection bordered={false}>
        <SectionHeading
          eyebrow="Modes"
          title="Five ways to play & learn"
          description="Step through problems on a focused page, learn in the studio, drill in Swipe mode, train Vim motions, or challenge your partner in two-player games."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch lg:grid-cols-6">
          <FeatureCard
            icon={<Play />}
            title="Play"
            body="Open a problem with inputs and step-by-step animation."
            cta="Open a problem"
            onClick={() => startIn('play')}
          />
          <FeatureCard
            icon={<Eye />}
            title="Visualize"
            body="Replay each algorithm on a live canvas."
            cta="Open canvas"
            onClick={() => startIn('visualize')}
          />
          <FeatureCard
            icon={<GraduationCap />}
            title="Learn"
            body="Study the pattern and reassemble the code."
            cta="Open studio"
            onClick={() => startIn('learn')}
          />
          <FeatureCard
            icon={<Smartphone />}
            title="Practice"
            body="Swipe through animate, quiz, and rebuild cards."
            cta="Open Swipe mode"
            onClick={() => enterMobile()}
          />
          <FeatureCard
            icon={<Keyboard />}
            title="Vim Dojo"
            body="Master Vim motions in a keyboard-only maze."
            cta="Enter the Dojo"
            onClick={() => enterVim()}
          />
          <FeatureCard
            icon={<Gamepad2 />}
            title="Games"
            body="Play Number Duel & more with your partner in real time."
            cta="Start a room"
            onClick={() => enterGames()}
          />
        </div>
      </LandingSection>

      {/* footer */}
      <footer className="border-t border-edge bg-panel/20">
        <div className={cn(LANDING_INNER, 'py-8 text-center sm:py-10')}>
          <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            Algo Moves
          </span>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink3">
            Step through interview algorithms until they stick.
          </p>
        </div>
      </footer>
    </div>
  );
}
