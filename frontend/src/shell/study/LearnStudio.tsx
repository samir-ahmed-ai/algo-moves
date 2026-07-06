import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  GraduationCap,
  Maximize2,
  Moon,
  Network,
  Sun,
} from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { catalog, browseBreadcrumbForItem } from '../../content';
import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts } from '@/lib/canvas';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { chromeText } from '../chromeUi';
import {
  Btn,
  Chip,
  EmptyState,
  difficultyTone,
  PanelBody,
  useQuizHostRelay,
  CanvasActionsProvider,
  CanvasFrameProvider,
  CanvasStaticProvider,
  useCanvasStatic,
  type CanvasActions,
} from '@/shell/canvas';
import { AssembleModes } from './components/AssembleModes';
import { RecallPane } from './components/RecallPane';
import {
  CodeStudioProvider,
  useCodeStudioContent,
  useCodeStudioPhase,
} from './CodeStudio';
import { CodeStudioQuiz } from './CodeStudioQuiz';
import { ProblemOverviewBody } from '@/shell/panels/problem/ProblemOverviewBody';
import { StudioViewPicker } from './StudioViewPicker';
import {
  flatOrder,
  isTabAvailable,
  STUDIO_GROUPS,
  STUDIO_TABS,
  STUDIO_TAB_PERSIST,
  type StudioGroupId,
  type StudioTab,
} from './studioTabs';

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
          <StudioShell key={item.id} />
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

function StudioShell() {
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
      spawnConnectedPanel: () => {},
      layoutVisualizeOptions: () => ({}),
    }),
    [avail, order, cont, go],
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
        <TopBar stages={stages} avail={avail} active={active} isMobile={isMobile} onGo={go} />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <StageBody active={active} cont={cont} onGo={go} />
        </div>
      </div>
    </CanvasActionsProvider>
  );
}

/* ------------------------------------------------------------------- top bar */

function IconBtn({
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
        'grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]',
        active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function TopBar({
  stages,
  avail,
  active,
  isMobile,
  onGo,
}: {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  isMobile: boolean;
  onGo: (id: string) => void;
}) {
  const { variants, active: activeVariant, setActive } = useCodeStudioContent();
  const { item } = useCanvasStatic();
  const { theme, setTheme, present, setPresent, enterProblemInMode } = useWorkspace();
  const browseCrumb = browseBreadcrumbForItem(item.id, catalog);

  return (
    <div className="flex min-h-11 shrink-0 items-center gap-1.5 border-b border-edge bg-panel px-2 py-1 sm:gap-2 sm:px-3">
      <IconBtn title="Open canvas" onClick={() => enterProblemInMode(item.id, 'visualize')}>
        <Network className="h-4 w-4" />
      </IconBtn>
      <GraduationCap className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
      <div className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold text-ink', chromeText.sm)}>{item.title}</span>
        {!isMobile && browseCrumb.track && browseCrumb.category && (
          <span className={cn('block truncate text-ink3', chromeText.xs)}>
            {browseCrumb.track.title} › {browseCrumb.category.title}
          </span>
        )}
      </div>
      <StudioViewPicker stages={stages} avail={avail} active={active} onGo={onGo} />
      {!isMobile && item.difficulty && <Chip tone={difficultyTone(item.difficulty)}>{item.difficulty}</Chip>}

      {variants.length > 1 && (
        <div className="flex shrink-0 items-center gap-0.5">
          {variants.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-md px-1.5 py-1 font-medium transition-colors',
                chromeText.sm,
                i === activeVariant ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
              )}
            >
              {(v.lang ?? 'text').toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <IconBtn
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </IconBtn>
      <IconBtn title="Presentation mode" active={present} onClick={() => setPresent(!present)}>
        <Maximize2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

/* ---------------------------------------------------------------------- body */

function StageBody({
  active,
  cont,
  onGo,
}: {
  active: StudioTab;
  cont: StudioTab | undefined;
  onGo: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div key={active.id} className="lesson-swap flex min-h-0 flex-1 flex-col overflow-hidden">
        {active.render === 'overview' ? (
          <ProblemOverviewBody />
        ) : active.render === 'recall' ? (
          <RecallPane />
        ) : active.render === 'assemble' ? (
          <AssembleModes />
        ) : active.wide ? (
          <div className="ws-scroll min-h-0 flex-1 overflow-auto">
            <PanelBody kind={active.kind!} />
          </div>
        ) : (
          <div className="ws-scroll min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-4">
            <div className="mx-auto w-full max-w-[820px]">
              <div className="rounded-[var(--radius)] border border-edge bg-panel p-3 text-ink sm:p-4">
                {active.render === 'quiz' ? <QuizContent /> : <PanelBody kind={active.kind!} />}
              </div>
              {active.render !== 'quiz' && cont && (
                <div className="mt-3 flex justify-end">
                  <Btn variant="ghost" size="sm" onClick={() => onGo(cont.id)}>
                    Next · {cont.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizContent() {
  const { active } = useCodeStudioContent();
  const { quiz, savedQuizProgress, nextLabel, onQuizProgress, onQuizContinue } = useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);
  if (!quiz) {
    return <EmptyState icon={<GraduationCap className="h-4 w-4" />} title="No quiz" hint="This problem has no quiz." />;
  }
  return (
    <CodeStudioQuiz
      key={`quiz-${item.id}-${active}`}
      quiz={quiz}
      itemId={item.id}
      initial={savedQuizProgress}
      nextLabel={nextLabel}
      onProgress={onQuizProgress}
      onContinue={onQuizContinue}
      onAnswer={relayQuizAnswer}
    />
  );
}

