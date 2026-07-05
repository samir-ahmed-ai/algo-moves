import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Network } from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { catalog, browseBreadcrumbForItem, getSiblingItems } from '../../content';
import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts } from '@/lib/canvas';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { BrowseBreadcrumb } from '../browse/BrowseBreadcrumb';
import { ChromeLabel, chromeText } from '../chromeUi';
import {
  Btn,
  Chip,
  difficultyTone,
  TransportBar,
  CanvasFrameProvider,
  CanvasStaticProvider,
  useCanvasStatic,
} from '@/shell/canvas';
import { ProblemPanelBody } from '@/shell/panels/problem/ProblemPanelBody';
import { VizPanelBody } from '@/shell/panels/visualize/VizPanelBody';

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
    [plugin, item, inputId, setInputId, customInput, setCustomInput, inputFrameCounts, selectedNode],
  );
  const frameValue = useMemo(() => ({ frames, player, frame }), [frames, player, frame]);

  return (
    <CanvasStaticProvider value={staticValue}>
      <CanvasFrameProvider value={frameValue}>
        <ProblemPageShell />
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

function ProblemPageShell() {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <ProblemPageHeader />
      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden',
          isMobile ? 'flex-col' : 'flex-row',
        )}
      >
        <aside
          className={cn(
            'ws-scroll shrink-0 overflow-y-auto border-edge bg-panel/40',
            isMobile ? 'max-h-[40vh] border-b' : 'w-[min(380px,38vw)] border-r',
          )}
        >
          <div className="p-3 sm:p-4">
            <div className="rounded-[var(--radius)] border border-edge bg-panel p-3 sm:p-4">
              <ProblemPanelBody />
            </div>
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="ws-scroll min-h-0 flex-1 overflow-auto">
            <VizPanelBody showTransport={false} />
          </div>
          <div className="flex shrink-0 justify-center border-t border-edge bg-panel/80 px-3 py-2 backdrop-blur">
            <TransportBar />
          </div>
        </main>
      </div>
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

  const list = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const idx = list.findIndex((i) => i.id === activeItemId);
  const showNav = list.length >= 2 && idx >= 0;

  const goSibling = (delta: number) => {
    const n = (idx + delta + list.length) % list.length;
    openProblem(list[n].id);
  };

  return (
    <header className="shrink-0 border-b border-edge bg-panel px-2 py-2 sm:px-3">
      {(trackId || categoryId) && (
        <BrowseBreadcrumb trackId={trackId} categoryId={categoryId} onBack={backToBrowse} />
      )}
      <div className="flex items-center gap-2">
        {showNav && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-panel2/60 px-0.5 py-0.5">
            <button
              type="button"
              onClick={() => goSibling(-1)}
              title="Previous problem"
              aria-label="Previous problem"
              className="grid h-6 w-6 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className={cn('px-1 font-mono tabular-nums text-ink3', chromeText.xs)}>
              {idx + 1}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => goSibling(1)}
              title="Next problem"
              aria-label="Next problem"
              className="grid h-6 w-6 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <ChromeLabel className="font-mono tracking-[0.12em]">PROBLEM</ChromeLabel>
          <h1 className={cn('truncate font-semibold text-ink', chromeText.base)}>{item.title}</h1>
        </div>
        {item.difficulty && !isMobile && (
          <Chip tone={difficultyTone(item.difficulty)}>{item.difficulty}</Chip>
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
      </div>
    </header>
  );
}
