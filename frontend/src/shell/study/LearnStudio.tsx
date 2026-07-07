import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { computeInputFrameCounts } from '@/lib/canvas';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import {
  EmptyState,
  CanvasActionsProvider,
  CanvasFrameProvider,
  CanvasStaticProvider,
  useCanvasStatic,
  type CanvasActions,
} from '@/shell/canvas';
import {
  CodeStudioProvider,
  useCodeStudioContent,
  useCodeStudioPhase,
} from './CodeStudio';
import { ProblemOverviewBody } from '@/shell/panels/problem/ProblemOverviewBody';
import { QuizStageBody } from '@/shell/panels/problem/QuizStageBody';
import { StudioAssembleStageBody } from '@/shell/panels/problem/StudioAssembleStageBody';
import { StudioPanelStageBody } from '@/shell/panels/problem/StudioPanelStageBody';
import { StudioViewPicker } from './StudioViewPicker';
import { ProblemSurfaceBar } from './ProblemSurfaceBar';
import { readStorageText, writeStorageText } from '@/store/persistence';
import {
  flatOrder,
  isTabAvailable,
  STUDIO_GROUPS,
  STUDIO_TABS,
  STUDIO_TAB_PERSIST,
  type StudioGroupId,
  type StudioTab,
} from './studioTabs';
import { studioNextAllLabel } from './studioArcNav';

export interface LearnStudioProps {
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

/**
 * The Learn Studio — the app's primary problem surface. A straightforward learning
 * shell: a slim top bar (identity · view picker · language · theme), and the active
 * view filling the rest. It mounts the same canvas context providers CanvasStage
 * providers CanvasStage builds (so every reused PanelBody works) plus the CodeStudio
 * phase machine, and renders no React Flow.
 */
export function LearnStudio({
  plugin,
  item,
  inputId,
  setInputId,
  customInput,
  setCustomInput,
  frames,
  player,
  frame,
  onOpenPalette,
  onOpenHelp,
}: LearnStudioProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  useEffect(() => {
    setSelectedNode(null);
  }, [plugin.meta.id, item.id]);
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
        <CodeStudioProvider>
          <StudioShell
            key={item.id}
            onOpenPalette={onOpenPalette}
            onOpenHelp={onOpenHelp}
          />
        </CodeStudioProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

function initialTab(itemId: string, avail: StudioTab[]): string {
  const saved = readStorageText(`${STUDIO_TAB_PERSIST}:${itemId}`, null);
  if (saved && avail.some((t) => t.id === saved)) return saved;
  const prefer =
    avail.find((t) => t.id === 'overview') ??
    avail.find((t) => t.id === 'quiz') ??
    avail.find((t) => t.id === 'pattern') ??
    avail[0];
  return prefer?.id ?? 'overview';
}

function StudioShell({
  onOpenPalette,
  onOpenHelp,
}: {
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
}) {
  const { hasQuiz, hasReassemble } = useCodeStudioPhase();
  const { reference } = useCodeStudioContent();
  const { item } = useCanvasStatic();
  const isMobile = useIsMobile();

  const avail = useMemo(
    () =>
      STUDIO_TABS.filter((t) =>
        isTabAvailable(t, { hasQuiz, hasPieces: hasReassemble, hasSource: !!reference }),
      ),
    [hasQuiz, hasReassemble, reference],
  );
  const order = useMemo(() => flatOrder(avail), [avail]);
  const stages = useMemo(() => STUDIO_GROUPS.filter((g) => avail.some((t) => t.group === g.id)), [avail]);

  const [activeId, setActiveId] = useState(() => initialTab(item.id, avail));

  useEffect(() => {
    writeStorageText(`${STUDIO_TAB_PERSIST}:${item.id}`, activeId);
  }, [item.id, activeId]);

  const active = avail.find((t) => t.id === activeId) ?? avail[0];

  const go = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  // "Next" target: the following view in canonical order.
  const cont = useMemo(() => {
    const i = order.findIndex((t) => t.id === activeId);
    return i >= 0 ? order[i + 1] : undefined;
  }, [order, activeId]);

  const lastTab = order[order.length - 1];

  // Learn-mode wiring for the reused practice panels (predict / mastery / quiz…):
  // focusing one selects its view; finishing one auto-advances to the next view in
  // canonical order — mirroring how Visualize mode advances the practice canvas.
  const studioActions = useMemo<CanvasActions>(
    () => ({
      focusPanel: (id) => {
        if (avail.some((t) => t.id === id)) setActiveId(id);
      },
      advancePractice: (fromId) => {
        const i = order.findIndex((t) => t.id === fromId);
        const next = i >= 0 ? order[i + 1] : cont;
        if (next) go(next.id);
      },
      advancePracticeAll: lastTab ? () => go(lastTab.id) : undefined,
      spawnConnectedPanel: () => {},
      layoutVisualizeOptions: () => ({}),
    }),
    [avail, order, cont, go, lastTab],
  );

  if (!active) {
    return (
      <div className="grid h-full w-full place-items-center bg-bg p-8">
        <EmptyState
          icon={<GraduationCap className="h-4 w-4" />}
          title="No studio content"
          hint="This problem has nothing to learn yet."
        />
      </div>
    );
  }

  return (
    <CanvasActionsProvider value={studioActions}>
      <div className="flex h-full w-full flex-col bg-bg">
        <LearnTopBar
          stages={stages}
          avail={avail}
          active={active}
          isMobile={isMobile}
          onGo={go}
          onOpenPalette={onOpenPalette}
          onOpenHelp={onOpenHelp}
        />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <StageBody avail={avail} active={active} cont={cont} lastTab={lastTab} onGo={go} />
        </div>
      </div>
    </CanvasActionsProvider>
  );
}

/* ------------------------------------------------------------------- top bar */

function LearnTopBar({
  stages,
  avail,
  active,
  isMobile,
  onGo,
  onOpenPalette,
  onOpenHelp,
}: {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  isMobile: boolean;
  onGo: (id: string) => void;
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
}) {
  const { variants, active: activeVariant, setActive } = useCodeStudioContent();

  return (
    <ProblemSurfaceBar
      onOpenPalette={onOpenPalette}
      onOpenHelp={onOpenHelp}
      badgeIcon={<GraduationCap className="h-4 w-4 text-accent" />}
      afterTitle={
        <StudioViewPicker
          compact={isMobile}
          stages={stages}
          avail={avail}
          active={active}
          onGo={onGo}
          variants={variants.length > 1 ? variants : undefined}
          activeVariant={activeVariant}
          onSetVariant={setActive}
        />
      }
      meta={null}
    />
  );
}

/* ---------------------------------------------------------------------- body */

function StageBody({
  avail,
  active,
  cont,
  lastTab,
  onGo,
}: {
  avail: StudioTab[];
  active: StudioTab;
  cont: StudioTab | undefined;
  lastTab: StudioTab | undefined;
  onGo: (id: string) => void;
}) {
  const onNext = cont ? () => onGo(cont.id) : undefined;
  const onNextAll = lastTab && cont ? () => onGo(lastTab.id) : undefined;
  const nextAllLabel = studioNextAllLabel(lastTab, cont);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div key={active.id} className="lesson-swap flex min-h-0 flex-1 flex-col overflow-hidden">
        {active.render === 'overview' ? (
          <ProblemOverviewBody
            nextLabel={cont?.label}
            onNext={onNext}
            nextAllLabel={nextAllLabel}
            onNextAll={onNextAll}
          />
        ) : active.render === 'quiz' ? (
          <QuizStageBody
            availTabs={avail}
            activeTabId={active.id}
            nextAllLabel={nextAllLabel}
            onNextAll={onNextAll}
          />
        ) : active.render === 'assemble' ? (
          <StudioAssembleStageBody
            availTabs={avail}
            activeTabId={active.id}
            nextLabel={cont?.label}
            onNext={onNext}
            nextAllLabel={nextAllLabel}
            onNextAll={onNextAll}
          />
        ) : (
          <StudioPanelStageBody
            kind={active.kind!}
            availTabs={avail}
            activeTabId={active.id}
            nextLabel={cont?.label}
            onNext={onNext}
            nextAllLabel={nextAllLabel}
            onNextAll={onNextAll}
          />
        )}
      </div>
    </div>
  );
}

