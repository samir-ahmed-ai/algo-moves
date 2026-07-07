import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Network } from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import {
  catalog,
  browseBreadcrumbForItem,
  getCategoryById,
  getSiblingItems,
  getTrackById,
} from '../../content';
import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts, buildFrameContextValue } from '@/lib/canvas';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { courseIcon } from '../courseIcon';
import { trackColor } from '../browse/trackColors';
import { chromeText } from '../chromeUi';
import {
  Btn,
  Chip,
  difficultyTone,
  CanvasFrameProvider,
  CanvasStaticProvider,
  useCanvasStatic,
} from '@/shell/canvas';
import { ProblemPanelBody } from '@/shell/panels/problem/ProblemPanelBody';
import {
  OverviewContentColumn,
  OverviewProblemColumn,
} from '@/shell/panels/problem/overviewColumns';
import { StudioSplitLayout } from '@/shell/panels/problem/studioSplitLayout';
import { useOverviewView } from '@/shell/panels/problem/useOverviewView';
import { CodeStudioProvider, useCodeStudioContent } from './CodeStudio';

export interface ProblemPageProps {
  plugin: ProblemPlugin<any, any>;
  item: Item;
  inputId: string;
  setInputId: (id: string) => void;
  customInput: unknown;
  setCustomInput: (v: unknown) => void;
  frames: Frame<any>[];
  player: Player;
  frame: Frame<any>;
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
}

export function ProblemPage({
  plugin,
  item,
  inputId,
  setInputId,
  customInput,
  setCustomInput,
  frames,
  player,
  frame,
}: ProblemPageProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const inputFrameCounts = useMemo(() => computeInputFrameCounts(plugin), [plugin]);
  const staticValue = useMemo(
    () => ({
      plugin,
      item,
      inputId,
      setInputId,
      customInput,
      setCustomInput,
      inputFrameCounts,
      selectedNode,
      setSelectedNode,
    }),
    [
      plugin,
      item,
      inputId,
      setInputId,
      customInput,
      setCustomInput,
      inputFrameCounts,
      selectedNode,
    ],
  );
  const frameValue = useMemo(
    () => buildFrameContextValue(frames, player, frame),
    [frames, player, frame],
  );

  return (
    <CanvasStaticProvider value={staticValue}>
      <CanvasFrameProvider value={frameValue}>
        <CodeStudioProvider>
          <ProblemPageShell />
        </CodeStudioProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

function ProblemPageShell() {
  const isMobile = useIsMobile();
  const { item } = useCanvasStatic();
  const { reference } = useCodeStudioContent();
  const hasRecall = !!reference;
  const [view, setView] = useOverviewView(item.id);
  const showViz = view === 'animate' || !hasRecall;

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <ProblemPageHeader />
      <StudioSplitLayout
        problem={
          <OverviewProblemColumn
            className={cn(isMobile && 'max-h-[40vh] shrink-0 border-b border-edge')}
            view={view}
            onView={setView}
            hasRecall={hasRecall}
          >
            <ProblemPanelBody />
          </OverviewProblemColumn>
        }
        second={<OverviewContentColumn showViz={showViz} />}
      />
    </div>
  );
}

function ProblemPageHeader() {
  const { item } = useCanvasStatic();
  const {
    activeTrackId,
    activeCategoryId,
    backToBrowse,
    openProblem,
    activeItemId,
    setMode,
    enterProblemInMode,
  } = useWorkspace();
  const isMobile = useIsMobile();

  const derived = browseBreadcrumbForItem(item.id, catalog);
  const trackId = activeTrackId ?? derived.track?.id ?? null;
  const categoryId = activeCategoryId ?? derived.category?.id ?? null;
  const track = trackId ? getTrackById(trackId) : undefined;
  const category = categoryId ? getCategoryById(categoryId) : undefined;
  const color = trackId ? trackColor(trackId) : null;
  const Icon = courseIcon(category?.icon ?? track?.icon);

  const list = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const idx = list.findIndex((i) => i.id === activeItemId);
  const showNav = list.length >= 2 && idx >= 0;

  const goSibling = (delta: number) => {
    const n = (idx + delta + list.length) % list.length;
    openProblem(list[n].id);
  };

  return (
    <header className="problem-surface-bar nodrag sticky top-0 z-20 flex h-11 shrink-0 items-center gap-1.5 border-b border-edge px-2 py-1 shadow-[var(--shadow-sm)] backdrop-blur sm:gap-2 sm:px-2.5">
      {(trackId || categoryId) && (
        <button
          type="button"
          onClick={backToBrowse}
          title="Back to category"
          aria-label="Back to category"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-edge bg-panel2/70 text-ink3 transition-colors hover:bg-panel hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {color && (
        <span
          className="surface-badge grid h-7 w-7 shrink-0 place-items-center rounded-md text-white shadow-[var(--shadow-sm)] [&>svg]:h-3.5 [&>svg]:w-3.5"
          style={{ background: `linear-gradient(135deg, ${color.c1}, ${color.c2})` }}
        >
          <Icon strokeWidth={1.6} />
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className={cn('truncate font-semibold text-ink', chromeText.sm)}>{item.title}</h1>
        {!isMobile && (track || category) && (
          <p className={cn('truncate text-ink3', chromeText.xs)} aria-label="Browse path">
            {track?.title}
            {track && category && ' › '}
            {category?.title}
          </p>
        )}
      </div>
      {showNav && (
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-edge bg-panel2/70 px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => goSibling(-1)}
            title="Previous problem"
            aria-label="Previous problem"
            className="grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className={cn('hidden px-1 font-mono tabular-nums text-ink3 sm:inline', chromeText.xs)}
          >
            {idx + 1}/{list.length}
          </span>
          <button
            type="button"
            onClick={() => goSibling(1)}
            title="Next problem"
            aria-label="Next problem"
            className="grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {item.difficulty && (
        <Chip tone={difficultyTone(item.difficulty)} className="hidden sm:inline-flex">
          {item.difficulty}
        </Chip>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <Btn
          variant="ghost"
          size="sm"
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          onClick={() => setMode('learn')}
        >
          {!isMobile && 'Learn'}
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          icon={<Network className="h-3.5 w-3.5" />}
          onClick={() => enterProblemInMode(item.id, 'visualize')}
        >
          {!isMobile && 'Canvas'}
        </Btn>
      </div>
    </header>
  );
}
