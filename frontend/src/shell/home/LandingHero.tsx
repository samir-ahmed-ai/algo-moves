import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Eye,
  LayoutGrid,
  MoreHorizontal,
  Play,
  Trophy,
} from 'lucide-react';
import { FeatureSelectorPopover } from '@/components/shared';
import { MORE_MODES_GROUPS } from './landingFeatureGroups';
import { browseBreadcrumbForItem, catalog } from '../../content';
import type { Item } from '../../content/types';
import { statFor, type ProgressData } from '@/store/persistence';
import { compactLabel } from '../chromeUi';
import { cn } from '@/lib/utils/cn';
import { glyphFor } from '../../content/problemShape';
import { Chip } from '@/design/components';
import { VimHeroPreview } from '@/shell/vim/ui/VimHeroPreview';

const MODE_PILL =
  'inline-flex shrink-0 items-center gap-1 rounded-md border border-edge bg-panel/60 px-2 py-1.5 text-sm text-ink2 transition-colors hover:border-accent/50 hover:text-ink';

const MBM_WORDS = ['move', 'by', 'move.'] as const;

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
}) {
  const lastBrowseCrumb = lastItem ? browseBreadcrumbForItem(lastItem.id, catalog) : undefined;

  return (
    <>
      <div className="@container lg:grid lg:grid-cols-2 lg:items-end lg:gap-x-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Interview prep
          </p>
          <h1 className="hero-headline font-semibold leading-[1.1] tracking-tight text-ink">
            Algorithms <MoveByMoveAnimated className="text-[0.72em] font-semibold" />
          </h1>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink2 sm:mt-3 lg:mt-0 lg:pb-0.5">
          {problems.length}+ interview problems as step-by-step replays — visualize, learn, and
          drill until they stick.
        </p>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:items-start lg:gap-2">
        <div className="flex flex-col gap-[var(--gap)]">
          <button
            type="button"
            onClick={() => onOpenItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 font-medium text-white transition-opacity hover:opacity-90"
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
        <ModeStrip
          onPlay={() => onStartIn('play')}
          onVisualize={() => onStartIn('visualize')}
          onLearn={() => onStartIn('learn')}
          onSwipe={onSwipe}
          onVim={onVim}
          onGames={onGames}
        />
      </div>

      <div className={cn('lg:grid lg:gap-3', lastItem ? 'lg:grid-cols-2' : 'lg:grid-cols-1')}>
        {lastItem ? (
          <button
            type="button"
            onClick={() => onOpenItem(lastItem.id)}
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
        <div
          className={cn(
            'hidden items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3 lg:flex',
            !lastItem && 'lg:col-span-1',
          )}
        >
          <VimHeroPreview />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Vim Dojo</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink3">
              Timed keyboard drills for motions, editing, and muscle memory.
            </p>
          </div>
          <button
            type="button"
            onClick={onVim}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-edge bg-panel2 px-3 py-2 text-xs font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-accent"
          >
            Open dojo
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
