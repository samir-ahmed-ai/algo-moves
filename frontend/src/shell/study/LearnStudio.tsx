import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Maximize2,
  Menu,
  Moon,
  Network,
  RotateCcw,
  ScanEye,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { catalog, browseBreadcrumbForItem } from '../../content';
import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts } from '@/lib/canvas';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { ChromeLabel, chromeText } from '../chromeUi';
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
import { CodeStudioProvider, useCodeStudio } from './CodeStudio';
import { CodeStudioQuiz } from './CodeStudioQuiz';
import { SplitCodeEditor } from '../../components/code/SplitCodeEditor';
import { ProblemOverviewBody } from '@/shell/panels/problem/ProblemOverviewBody';
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
 * shell: a slim top bar (identity · language · theme), a grouped list of every view,
 * and the active view filling the rest. On a narrow screen the list collapses behind
 * a menu button so every view stays one tap away. It mounts the same canvas context
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
  const cs = useCodeStudio();
  const { item } = useCanvasStatic();
  const isMobile = useIsMobile();

  const avail = useMemo(
    () =>
      STUDIO_TABS.filter((t) =>
        isTabAvailable(t, { hasQuiz: cs.hasQuiz, hasPieces: cs.hasReassemble, hasSource: !!cs.reference }),
      ),
    [cs.hasQuiz, cs.hasReassemble, cs.reference],
  );
  const order = useMemo(() => flatOrder(avail), [avail]);
  const stages = useMemo(() => STUDIO_GROUPS.filter((g) => avail.some((t) => t.group === g.id)), [avail]);

  const [activeId, setActiveId] = useState(() => initialTab(item.id, avail));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    writeStorageText(`${STUDIO_TAB_PERSIST}:${item.id}`, activeId);
  }, [item.id, activeId]);

  const active = avail.find((t) => t.id === activeId) ?? avail[0];

  const go = useCallback((id: string) => {
    setActiveId(id);
    setNavOpen(false);
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
        <TopBar active={active} isMobile={isMobile} onMenu={() => setNavOpen(true)} />
        <div className="flex min-h-0 flex-1">
          {!isMobile && (
            <nav className="ws-scroll w-[188px] shrink-0 overflow-y-auto border-r border-edge bg-panel2/40 py-1.5">
              <NavList stages={stages} avail={avail} active={active} onGo={go} />
            </nav>
          )}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <StageBody active={active} cont={cont} onGo={go} />
          </div>
        </div>
        {isMobile && navOpen && (
          <MobileNav stages={stages} avail={avail} active={active} onGo={go} onClose={() => setNavOpen(false)} />
        )}
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
  active,
  isMobile,
  onMenu,
}: {
  active: StudioTab;
  isMobile: boolean;
  onMenu: () => void;
}) {
  const cs = useCodeStudio();
  const { item } = useCanvasStatic();
  const { theme, setTheme, present, setPresent, enterProblemInMode } = useWorkspace();
  const browseCrumb = browseBreadcrumbForItem(item.id, catalog);

  return (
    <div className="flex min-h-11 shrink-0 items-center gap-1.5 border-b border-edge bg-panel px-2 py-1 sm:gap-2 sm:px-3">
      {isMobile && (
        <IconBtn title="Views" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </IconBtn>
      )}
      <IconBtn title="Open canvas" onClick={() => enterProblemInMode(item.id, 'visualize')}>
        <Network className="h-4 w-4" />
      </IconBtn>
      <GraduationCap className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
      <div className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold text-ink', chromeText.sm)}>
          {isMobile ? active.label : item.title}
        </span>
        {!isMobile && browseCrumb.track && browseCrumb.category && (
          <span className={cn('block truncate text-ink3', chromeText.xs)}>
            {browseCrumb.track.title} › {browseCrumb.category.title}
          </span>
        )}
      </div>
      {!isMobile && item.difficulty && <Chip tone={difficultyTone(item.difficulty)}>{item.difficulty}</Chip>}

      {cs.variants.length > 1 && (
        <div className="flex shrink-0 items-center gap-0.5">
          {cs.variants.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => cs.setActive(i)}
              className={cn(
                'rounded-md px-1.5 py-1 font-medium transition-colors',
                chromeText.sm,
                i === cs.active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
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

/* ----------------------------------------------------------------- navigation */

function NavList({
  stages,
  avail,
  active,
  onGo,
  big,
}: {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  onGo: (id: string) => void;
  big?: boolean;
}) {
  const ordered = flatOrder(avail);
  return (
    <>
      {stages.map((g) => {
        const tabs = ordered.filter((t) => t.group === g.id);
        if (!tabs.length) return null;
        return (
          <div key={g.id} className="mb-1 px-2">
            <ChromeLabel className="px-2 py-1 font-semibold normal-case tracking-wide">{g.label}</ChromeLabel>
            <div className="flex flex-col gap-0.5">
              {tabs.map((t) => {
                const Icon = t.icon;
                const on = t.id === active.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onGo(t.id)}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 text-left transition-colors min-h-[var(--row)]',
                      big ? cn('py-1', chromeText.base) : cn('py-0', chromeText.sm),
                      on ? 'bg-accentbg font-medium text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function MobileNav({
  stages,
  avail,
  active,
  onGo,
  onClose,
}: {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  onGo: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-bg/60" aria-hidden />
      <nav
        className="ws-scroll relative flex w-[82%] max-w-[320px] flex-col overflow-y-auto border-r border-edge bg-panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-panel px-3 py-2">
          <span className={cn('font-semibold text-ink', chromeText.sm)}>Views</span>
          <IconBtn title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
        <div className="py-2">
          <NavList stages={stages} avail={avail} active={active} onGo={onGo} big />
        </div>
      </nav>
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
  const Icon = active.icon;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-edge px-3">
        <Icon className="h-4 w-4 shrink-0 text-accent" />
        <span className={cn('truncate font-medium text-ink', chromeText.sm)}>{active.label}</span>
      </div>
      <div key={active.id} className="lesson-swap flex min-h-0 flex-1 flex-col overflow-hidden">
        {active.render === 'overview' ? (
          <ProblemOverviewBody />
        ) : active.render === 'recall' ? (
          <RecallBody />
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
  const cs = useCodeStudio();
  const { item } = useCanvasStatic();
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);
  if (!cs.quiz) {
    return <EmptyState icon={<GraduationCap className="h-4 w-4" />} title="No quiz" hint="This problem has no quiz." />;
  }
  return (
    <CodeStudioQuiz
      key={`quiz-${item.id}-${cs.active}`}
      quiz={cs.quiz}
      itemId={item.id}
      initial={cs.savedQuizProgress}
      nextLabel={cs.nextLabel}
      onProgress={cs.onQuizProgress}
      onContinue={cs.onQuizContinue}
      onAnswer={relayQuizAnswer}
    />
  );
}

function RecallBody() {
  const cs = useCodeStudio();
  const isMobile = useIsMobile();
  const { theme, themePreset } = useWorkspace();
  if (!cs.reference) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <EmptyState icon={<ScanEye className="h-4 w-4" />} title="No source" hint="This problem has no solution to recall." />
      </div>
    );
  }
  const pct = Math.round(cs.score);
  const blindTitle = cs.blind ? 'Blind recall' : 'Reference mode';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-edge px-2 py-1">
        <Btn
          size="xs"
          variant={cs.blind ? 'primary' : 'ghost'}
          icon={cs.blind ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          title={blindTitle}
          onClick={() => cs.setBlind((b) => !b)}
        >
          {isMobile ? null : cs.blind ? 'Blind' : 'Reference'}
        </Btn>
        <Btn
          size="xs"
          variant="ghost"
          icon={<ScanEye className="h-3.5 w-3.5" />}
          title="Hold to peek at reference"
          onMouseDown={() => cs.setPeek(true)}
          onMouseUp={() => cs.setPeek(false)}
          onMouseLeave={() => cs.setPeek(false)}
        >
          {isMobile ? null : 'Peek'}
        </Btn>
        <Btn
          size="xs"
          variant="ghost"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          title="Reset to skeleton"
          onClick={() => cs.persistDraft(cs.skeleton)}
        >
          {isMobile ? null : 'Reset'}
        </Btn>
        <Btn
          size="xs"
          variant={cs.timerRunning ? 'good' : 'ghost'}
          icon={<Timer className="h-3.5 w-3.5" />}
          title={cs.timerRunning ? 'Stop recall timer' : 'Start recall timer'}
          onClick={() => cs.setTimerRunning((r) => !r)}
        >
          {isMobile ? null : cs.timerLabel}
        </Btn>
        <div className="flex-1" />
        <Chip tone={pct >= 80 ? 'good' : pct >= 50 ? 'accent' : 'muted'} mono>
          {isMobile ? `${pct}%` : `${pct}% match`}
        </Chip>
      </div>
      <div className="min-h-0 flex-1">
        <SplitCodeEditor
          reference={cs.reference}
          draft={cs.draft}
          lang={cs.code?.lang}
          dark={theme === 'dark'}
          themeKey={themePreset}
          vim={cs.editorPrefs.vim}
          wrap={cs.editorPrefs.wrap}
          hideLeft={cs.blind}
          peekLeft={cs.peek}
          splitPct={cs.editorPrefs.splitPct}
          onSplitPctChange={(splitPct) => cs.setEditorPrefs({ splitPct })}
          onDraftChange={cs.persistDraft}
        />
      </div>
    </div>
  );
}
