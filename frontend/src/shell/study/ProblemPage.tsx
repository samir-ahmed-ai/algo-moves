import { useMemo, useState } from 'react';
import { GraduationCap, Network } from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { catalog, browseBreadcrumbForItem, getCategoryById, getTrackById } from '../../content';
import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts, buildFrameContextValue } from '@/lib/canvas';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { courseIcon } from '../courseIcon';
import { trackColor } from '../browse/trackColors';
import {
  Btn,
  CanvasFrameProvider,
  CanvasStaticProvider,
  useCanvasFrame,
  useCanvasStatic,
} from '@/shell/canvas';
import { HeaderBadge, ProblemSurfaceBar } from './ProblemSurfaceBar';
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
  onOpenPalette?: (() => void) | undefined;
  onOpenHelp?: (() => void) | undefined;
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
  const { item, plugin } = useCanvasStatic();
  const { player } = useCanvasFrame();
  const { reference } = useCodeStudioContent();
  const isStatic = !!plugin.meta.static;
  const hasAnimation = player.total > 1;
  const hasSource = !!reference;
  const hasBoard = hasAnimation || isStatic;
  const [rawView, setView] = useOverviewView(item.id);
  const view = hasBoard ? (hasSource ? rawView : 'animate') : hasSource ? 'recall' : 'animate';
  const canToggle = hasBoard && hasSource;
  const showViz = view === 'animate';

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <ProblemPageHeader />
      <StudioSplitLayout
        problem={
          <OverviewProblemColumn
            className={cn(isMobile && 'max-h-[min(40vh,50%)] min-h-0 border-b border-edge')}
            view={view}
            onView={setView}
            canToggle={canToggle}
            boardLabel={isStatic ? 'Design' : 'Animate'}
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
  const { activeTrackId, activeCategoryId, backToBrowse, setMode, enterProblemInMode } =
    useWorkspace();
  const isMobile = useIsMobile();

  const derived = browseBreadcrumbForItem(item.id, catalog);
  const trackId = activeTrackId ?? derived.track?.id ?? null;
  const categoryId = activeCategoryId ?? derived.category?.id ?? null;
  const track = trackId ? getTrackById(trackId) : undefined;
  const category = categoryId ? getCategoryById(categoryId) : undefined;
  const color = trackId ? trackColor(trackId) : null;
  const Icon = courseIcon(category?.icon ?? track?.icon);

  return (
    <ProblemSurfaceBar
      onBack={trackId || categoryId ? backToBrowse : undefined}
      backTitle="Back to category"
      badge={color ? <HeaderBadge gradient={color} icon={<Icon strokeWidth={1.6} />} /> : undefined}
      actions={
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
      }
    />
  );
}
