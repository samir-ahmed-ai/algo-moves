import { type ComponentType, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  Gamepad2,
  GraduationCap,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  Play,
  Smartphone,
  TimerReset,
  Trophy,
} from 'lucide-react';
import { browseBreadcrumbForItem, catalog } from '../../content';
import type { Item } from '../../content/types';
import { statFor, type ProgressData } from '@/store/persistence';
import { compactLabel } from '../chromeUi';
import { cn } from '@/lib/utils/cn';
import { glyphFor } from '../../content/problemShape';
import { Chip } from '@/design/components';

const MBM_WORDS = ['move', 'by', 'move.'] as const;
const HERO_TRACE = [
  { label: 'choose input', value: 'nums = [2, 7, 11, 15]' },
  { label: 'frame replay', value: 'target - nums[i] -> 7' },
  { label: 'compare state', value: 'seen.has(7) = true' },
  { label: 'lock answer', value: 'return [0, 1]' },
] as const;

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

function HeroReplayPanel({ count, firstTitle }: { count: number; firstTitle?: string }) {
  return (
    <div
      className="landing-hero-replay overflow-hidden rounded-lg border border-edge bg-panel/75 p-3 shadow-[var(--shadow-md)]"
      aria-label="Algorithm replay preview"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-accent">
            Replay studio
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">
            {firstTitle ?? 'Interview problem'}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-edge bg-panel2 px-2 py-1 font-mono text-[length:var(--fs-2xs)] font-semibold text-ink2">
          <Code2 className="h-3.5 w-3.5 text-accent" />
          {count}+
        </span>
      </div>
      <div className="mt-3 space-y-1.5 font-mono text-[0.72rem] leading-relaxed">
        {HERO_TRACE.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              'hero-trace-row flex items-center gap-2 rounded-md border px-2 py-1.5',
              index === 1
                ? 'border-accent/60 bg-accentbg text-ink'
                : 'border-edge bg-panel/70 text-ink2',
            )}
            style={{ '--step': index } as CSSProperties}
          >
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-md',
                index === 3 ? 'bg-goodbg text-good' : 'bg-panel2 text-accent',
              )}
            >
              {index === 3 ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <TimerReset className="h-3 w-3" />
              )}
            </span>
            <span className="w-20 shrink-0 truncate text-ink3">{step.label}</span>
            <code className="min-w-0 truncate text-ink">{step.value}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ mode grid */

interface ModeCard {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  c1: string;
  c2: string;
  onClick: () => void;
}

interface ModeGroup {
  label?: string;
  modes: ModeCard[];
}

function LandingModeCard({ mode, index }: { mode: ModeCard; index: number }) {
  const Icon = mode.icon;
  return (
    <button
      type="button"
      onClick={mode.onClick}
      className="landing-mode-card group relative flex items-center gap-3 overflow-hidden rounded-xl border border-edge bg-panel/70 p-3 text-left shadow-[var(--shadow-sm)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-md)]"
      style={
        {
          '--mode-c1': mode.c1,
          '--mode-c2': mode.c2,
          animationDelay: `${index * 50}ms`,
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-50"
        style={{ background: mode.c1 }}
      />
      <span
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white shadow-[var(--shadow-sm)] [&>svg]:h-5 [&>svg]:w-5"
        style={{ background: `linear-gradient(135deg, ${mode.c1}, ${mode.c2})` }}
      >
        <Icon />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{mode.title}</span>
        <span className="block truncate text-xs text-ink3">{mode.desc}</span>
      </span>
      <ArrowRight className="relative h-4 w-4 shrink-0 text-ink3 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
    </button>
  );
}

function LandingModeGrid({ groups }: { groups: ModeGroup[] }) {
  const totalModes = groups.reduce((count, group) => count + group.modes.length, 0);
  let cardIndex = 0;

  return (
    <section aria-label="Explore every mode">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Jump into a mode
        </p>
        <span className="text-[length:var(--fs-2xs)] text-ink3">{totalModes} ways to practice</span>
      </div>
      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`}>
            {group.label ? (
              <p className="mb-2 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-ink3">
                {group.label}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {group.modes.map((mode) => {
                const index = cardIndex;
                cardIndex += 1;
                return <LandingModeCard key={mode.id} mode={mode} index={index} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingHero({
  problems,
  lastItem,
  firstProblem,
  progress,
  isMobile,
  onOpenItem,
  onBrowseTrack,
  onStartIn,
  onSwipe,
  onVim,
  onGames,
  onPlans,
  onResumes,
  onInterviewCanvas,
}: {
  problems: Item[];
  lastItem?: Item;
  firstProblem?: Item;
  progress: ProgressData;
  isMobile: boolean;
  onOpenItem: (id: string) => void;
  onBrowseTrack: (trackId: 'interview-prep') => void;
  onStartIn: (mode: 'play' | 'visualize' | 'learn') => void;
  onSwipe: () => void;
  onVim: () => void;
  onGames: () => void;
  onPlans: () => void;
  onResumes: () => void;
  onInterviewCanvas: () => void;
}) {
  const lastBrowseCrumb = lastItem ? browseBreadcrumbForItem(lastItem.id, catalog) : undefined;

  const modeGroups: ModeGroup[] = [
    {
      modes: [
        {
          id: 'play',
          icon: Play,
          title: 'Play',
          desc: 'Drill a problem',
          c1: '#21a7ff',
          c2: '#2f6bff',
          onClick: () => onStartIn('play'),
        },
        {
          id: 'learn',
          icon: GraduationCap,
          title: 'Learn',
          desc: 'Guided studio',
          c1: '#ffb020',
          c2: '#ff7a1a',
          onClick: () => onStartIn('learn'),
        },
        {
          id: 'swipe',
          icon: Smartphone,
          title: 'Swipe',
          desc: 'Mobile deck',
          c1: '#7c5cff',
          c2: '#b06bff',
          onClick: onSwipe,
        },
      ],
    },
    {
      label: 'Interview',
      modes: [
        {
          id: 'interview-canvas',
          icon: LayoutTemplate,
          title: 'Interview Canvas',
          desc: 'Whiteboard + code studio',
          c1: '#6366f1',
          c2: '#4338ca',
          onClick: onInterviewCanvas,
        },
        {
          id: 'plans',
          icon: BookMarked,
          title: 'Plans',
          desc: 'Interview prep',
          c1: '#16c79a',
          c2: '#0e9aa5',
          onClick: onPlans,
        },
        {
          id: 'resumes',
          icon: FileText,
          title: 'Resumes',
          desc: 'Template creator',
          c1: '#7c5cff',
          c2: '#2f6bff',
          onClick: onResumes,
        },
      ],
    },
    {
      label: 'Games & drills',
      modes: [
        {
          id: 'games',
          icon: Gamepad2,
          title: 'Games',
          desc: 'Two-player rooms',
          c1: '#ff6b4a',
          c2: '#ff2d55',
          onClick: onGames,
        },
        {
          id: 'vim',
          icon: Keyboard,
          title: 'Vim Dojo',
          desc: 'Keyboard drills',
          c1: '#ff4d94',
          c2: '#7c3aed',
          onClick: onVim,
        },
      ],
    },
  ];

  return (
    <>
      <div className="@container grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.86fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Interview prep
            </p>
            <h1 className="hero-headline font-semibold leading-[1.08] text-ink">
              Algorithms <MoveByMoveAnimated className="text-[0.72em] font-semibold" />
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-ink2">
            {problems.length}+ interview problems as step-through replays, quizzes, and drills that
            keep state visible until the move clicks.
          </p>
        </div>
        <HeroReplayPanel count={problems.length} firstTitle={firstProblem?.title} />
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:items-start lg:gap-2">
        <button
          type="button"
          onClick={() => onOpenItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 font-medium text-white shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
        >
          <Play className="h-3.5 w-3.5" />
          {lastItem
            ? compactLabel('Resume learning', 'Resume', isMobile)
            : compactLabel('Start learning', 'Start', isMobile)}
        </button>
        <button
          type="button"
          onClick={() => onBrowseTrack('interview-prep')}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-edge bg-panel/60 px-3 py-2 font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {compactLabel('Browse tracks', 'Browse', isMobile)}
        </button>
      </div>

      {lastItem ? (
        <button
          type="button"
          onClick={() => onOpenItem(lastItem.id)}
          className="group flex w-full items-center gap-3 rounded-lg border border-edge bg-panel/70 p-3 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-edge bg-panel2 text-ink2">
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

      <LandingModeGrid groups={modeGroups} />
    </>
  );
}
