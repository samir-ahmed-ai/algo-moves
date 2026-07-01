import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Keyboard,
  RotateCcw,
  ScanEye,
  SkipForward,
  Timer,
  WrapText,
} from 'lucide-react';
import { ReassemblePane } from '../../components/ReassemblePane';
import { SplitCodeEditor } from '../../components/SplitCodeEditor';
import { CodeStudioQuiz } from './CodeStudioQuiz';
import { patternsForTags } from '../../content';
import type { QuizQuestion } from '../../core/types';
import { extractSkeleton } from '../../lib/codeSkeleton';
import { assembleDraft, resolveCodePieces, type CodePiece } from '../../lib/codePieces';
import {
  clearQuizProgress,
  clearReassembleProgress,
  loadPhase,
  loadQuizProgress,
  loadReassembleProgress,
  nextPhase,
  phaseSequence,
  savePhase,
  saveQuizProgress,
  saveReassembleProgress,
  type CodeStudioPhase,
  type PhaseAvailability,
  type QuizProgress,
} from '../../lib/codeStudioPhase';
import { matchScore } from '../../lib/codeDiff';
import { type EditorPrefs, useEditorPrefs } from '../../lib/editorPrefs';
import { parseComplexity } from '../../lib/parseComplexity';
import { recordAttempt, useProgress, statFor } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';
import { useWorkspace } from '../../lib/workspace';
import { useCanvasStatic } from './CanvasContext';
import { PanelHeaderAction, PanelHeaderMenu } from './nodeui';

interface CodeVariant {
  text: string;
  lang?: string;
  file?: string;
}

interface CodeStudioContextValue {
  variants: CodeVariant[];
  active: number;
  setActive: (i: number) => void;
  code: CodeVariant | undefined;
  reference: string;
  draft: string;
  persistDraft: (v: string) => void;
  skeleton: string;
  blind: boolean;
  setBlind: (v: boolean | ((b: boolean) => boolean)) => void;
  peek: boolean;
  setPeek: (v: boolean) => void;
  copied: boolean;
  copyRef: () => Promise<void>;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  timerRunning: boolean;
  setTimerRunning: (v: boolean | ((r: boolean) => boolean)) => void;
  timerLabel: string;
  score: number;
  timeLabel: string | undefined;
  spaceLabel: string | undefined;
  stat: ReturnType<typeof statFor>;
  theme: 'dark' | 'light' | undefined;
  phase: CodeStudioPhase;
  phaseSeq: CodeStudioPhase[];
  /** Human label of the phase that follows the current one (e.g. "Structure"). */
  nextLabel: string;
  goToPhase: (p: CodeStudioPhase) => void;
  /** Move to the next phase in the sequence (Skip / Continue). */
  advance: () => void;
  quiz: QuizQuestion[] | null;
  hasQuiz: boolean;
  savedQuizProgress: QuizProgress | null;
  onQuizProgress: (p: QuizProgress) => void;
  onQuizContinue: (score: number) => void;
  pieces: CodePiece[] | null;
  hasReassemble: boolean;
  phaseTransition: boolean;
  resetReassemble: () => void;
  reassembleKey: number;
  onReassembleComplete: (placed: CodePiece[], mistakes: number) => void;
  savedReassembleProgress: ReturnType<typeof loadReassembleProgress>;
  /** When set, the studio stays on this phase (standalone Structure panel). */
  phaseLocked: boolean;
}

const PHASE_LABEL: Record<CodeStudioPhase, string> = {
  quiz: 'Quiz',
  reassemble: 'Structure',
  recall: 'Recall',
};

/** Phase cross-fade duration (ms); paired with the CSS enter/exit animations. */
const TRANSITION_MS = 340;

const CodeStudioCtx = createContext<CodeStudioContextValue | null>(null);

export function useCodeStudio() {
  const ctx = useContext(CodeStudioCtx);
  if (!ctx) throw new Error('CodeStudio components must be used within CodeStudioProvider');
  return ctx;
}

function codeVariants(plugin: { code?: CodeVariant; extraCode?: CodeVariant[] }) {
  return [plugin.code, ...(plugin.extraCode ?? [])].filter(Boolean) as CodeVariant[];
}

function LangTabs({ variants, active, onPick }: { variants: CodeVariant[]; active: number; onPick: (i: number) => void }) {
  if (variants.length < 2) return null;
  return (
    <>
      {variants.map((v, i) => (
        <PanelHeaderAction
          key={i}
          variant="toggle"
          active={i === active}
          onClick={() => onPick(i)}
          title={`${(v.lang ?? 'text').toUpperCase()}${v.file ? ` · ${v.file}` : ''}`}
        >
          <Code2 className="h-3 w-3" />
        </PanelHeaderAction>
      ))}
    </>
  );
}

const STEP_GLYPH = ['①', '②', '③'];

function PhaseStepper({
  seq,
  phase,
  onJump,
}: {
  seq: CodeStudioPhase[];
  phase: CodeStudioPhase;
  onJump: (p: CodeStudioPhase) => void;
}) {
  if (seq.length < 2) return null;
  const curIdx = seq.indexOf(phase);
  return (
    <div className={cn('nodrag flex h-6 shrink-0 items-center gap-0.5 rounded-md bg-panel2 p-0.5 font-medium', chromeText.sm)}>
      {seq.map((p, idx) => {
        const done = idx < curIdx;
        const active = idx === curIdx;
        return (
          <Fragment key={p}>
            {idx > 0 && (
              <span className="text-ink3" aria-hidden>
                →
              </span>
            )}
            <button
              type="button"
              title={`Go to ${PHASE_LABEL[p]}`}
              aria-current={active ? 'step' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onJump(p);
              }}
              className={cn(
                'flex h-6 items-center gap-1 rounded px-1.5 transition-colors',
                active
                  ? 'bg-accentbg text-accent'
                  : done
                    ? 'text-good hover:bg-panel'
                    : 'text-ink3 hover:bg-panel hover:text-ink2',
              )}
            >
              <span aria-hidden className="font-mono">
                {done ? '✓' : STEP_GLYPH[idx]}
              </span>
              {PHASE_LABEL[p]}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

export function CodeStudioProvider({
  children,
  phaseLock,
}: {
  children: ReactNode;
  phaseLock?: CodeStudioPhase;
}) {
  const { plugin, item } = useCanvasStatic();
  const { theme } = useWorkspace();
  const progress = useProgress();
  const stat = statFor(progress, item.id);
  const variants = codeVariants(plugin);
  const [active, setActive] = useState(0);
  const [blind, setBlind] = useState(false);
  const [peek, setPeek] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editorPrefs, setEditorPrefs] = useEditorPrefs();
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [phaseTransition, setPhaseTransition] = useState(false);
  const [reassembleKey, setReassembleKey] = useState(0);
  const transitionTimer = useRef<number | null>(null);

  const clearTransition = useCallback(() => {
    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
  }, []);

  /** Run a phase swap after the cross-fade, cancelling any pending one first. */
  const scheduleTransition = useCallback(
    (fn: () => void) => {
      clearTransition();
      transitionTimer.current = window.setTimeout(() => {
        transitionTimer.current = null;
        fn();
      }, TRANSITION_MS);
    },
    [clearTransition],
  );

  useEffect(() => clearTransition, [clearTransition]);

  const code = variants[Math.min(active, Math.max(variants.length - 1, 0))];
  const reference = code?.text ?? '';
  const pieces = useMemo(
    () => resolveCodePieces(reference, plugin.codePieces),
    [reference, plugin.codePieces],
  );
  const hasReassemble = pieces !== null && pieces.length > 0;
  const quiz = plugin.quiz && plugin.quiz.length > 0 ? plugin.quiz : null;
  const hasQuiz = quiz !== null;
  const av = useMemo<PhaseAvailability>(
    () => ({ hasQuiz, hasPieces: hasReassemble }),
    [hasQuiz, hasReassemble],
  );
  const phaseSeq = useMemo(() => phaseSequence(av), [av]);

  const draftKey = `algo-moves:draft:${item.id}:${active}`;
  const skeleton = useMemo(() => (reference ? extractSkeleton(reference) : ''), [reference]);

  const [phase, setPhase] = useState<CodeStudioPhase>(() =>
    phaseLock ?? loadPhase(item.id, active, av),
  );

  const loadDraft = useCallback(() => {
    if (!reference) return '';
    try {
      return localStorage.getItem(draftKey) ?? skeleton;
    } catch {
      return skeleton;
    }
  }, [draftKey, skeleton, reference]);

  const [draft, setDraft] = useState(loadDraft);

  useEffect(() => {
    clearTransition();
    setPhaseTransition(false);
    setDraft(loadDraft());
    setPhase(phaseLock ?? loadPhase(item.id, active, av));
    setReassembleKey((k) => k + 1);
  }, [loadDraft, item.id, active, av, clearTransition, phaseLock]);

  const persistDraft = useCallback(
    (v: string) => {
      setDraft(v);
      try {
        localStorage.setItem(draftKey, v);
      } catch {
        /* ignore */
      }
    },
    [draftKey],
  );

  const enterRecall = useCallback(
    (draftValue: string, startTimer = true) => {
      setPhaseTransition(true);
      persistDraft(draftValue);
      savePhase(item.id, active, 'recall');
      clearReassembleProgress(item.id, active);
      scheduleTransition(() => {
        setPhase('recall');
        setPhaseTransition(false);
        if (startTimer) setTimerRunning(true);
      });
    },
    [persistDraft, item.id, active, scheduleTransition],
  );

  /** Animated, persisted jump to any phase (stepper navigation). Re-entering the
   *  quiz is a fresh restart, so its saved progress is cleared first. */
  const goToPhase = useCallback(
    (target: CodeStudioPhase) => {
      if (phaseLock) return;
      if (target === phase) return;
      if (target === 'quiz') clearQuizProgress(item.id, active);
      setPhaseTransition(true);
      savePhase(item.id, active, target);
      if (target !== 'recall') {
        setTimerRunning(false);
        setTimerSec(0);
      }
      scheduleTransition(() => {
        setPhase(target);
        setPhaseTransition(false);
      });
    },
    [phase, item.id, active, scheduleTransition],
  );

  /** Skip / continue to the next phase in the sequence. */
  const advance = useCallback(() => {
    if (phaseLock) return;
    const target = nextPhase(phase, av);
    if (target === phase) return;
    if (target === 'recall') enterRecall(skeleton, false);
    else goToPhase(target);
  }, [phase, av, enterRecall, skeleton, goToPhase]);

  const resetReassemble = useCallback(() => {
    clearReassembleProgress(item.id, active);
    savePhase(item.id, active, 'reassemble');
    setPhase('reassemble');
    setReassembleKey((k) => k + 1);
    setTimerRunning(false);
    setTimerSec(0);
  }, [item.id, active]);

  const onReassembleComplete = useCallback(
    (placed: CodePiece[], mistakes: number) => {
      if (mistakes <= 3) recordAttempt(item.id, true);
      if (phaseLock === 'reassemble') return;
      enterRecall(assembleDraft(reference, placed), true);
    },
    [enterRecall, item.id, reference, phaseLock],
  );

  const onQuizProgress = useCallback(
    (p: QuizProgress) => saveQuizProgress(item.id, active, p),
    [item.id, active],
  );

  const onQuizContinue = useCallback(() => {
    const target = nextPhase('quiz', av);
    if (target === 'recall') enterRecall(skeleton, false);
    else goToPhase(target);
  }, [av, enterRecall, skeleton, goToPhase]);

  const score = reference ? matchScore(reference, draft) : 0;
  const parsed = parseComplexity(reference);
  const cards = patternsForTags(item.tags);
  const fallbackTime = cards.map((c) => c.complexity.match(/O\([^)]*\)/)?.[0]).find(Boolean);
  const timeLabel = parsed.time ?? fallbackTime;
  const spaceLabel = parsed.space;

  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  useEffect(() => {
    setTimerSec(0);
    setTimerRunning(false);
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'recall') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '\\') {
        e.preventDefault();
        setBlind((b) => !b);
      }
      if (e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        persistDraft(skeleton);
      }
      if (e.key === 'v' && e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ vim: !editorPrefs.vim });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skeleton, persistDraft, editorPrefs.vim, setEditorPrefs]);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const timerLabel = `${String(Math.floor(timerSec / 60)).padStart(2, '0')}:${String(timerSec % 60).padStart(2, '0')}`;

  const savedReassembleProgress = useMemo(
    () => (phase === 'reassemble' ? loadReassembleProgress(item.id, active) : null),
    [phase, item.id, active, reassembleKey],
  );

  const savedQuizProgress = useMemo(
    () => (phase === 'quiz' ? loadQuizProgress(item.id, active) : null),
    [phase, item.id, active],
  );

  if (variants.length === 0) {
    return <p className={cn('px-3 py-2 text-ink3', chromeText.base)}>No source for this problem.</p>;
  }

  return (
    <CodeStudioCtx.Provider
      value={{
        variants,
        active,
        setActive,
        code,
        reference,
        draft,
        persistDraft,
        skeleton,
        blind,
        setBlind,
        peek,
        setPeek,
        copied,
        copyRef,
        editorPrefs,
        setEditorPrefs,
        timerRunning,
        setTimerRunning,
        timerLabel,
        score,
        timeLabel,
        spaceLabel,
        stat,
        theme: theme === 'dark' ? 'dark' : 'light',
        phase,
        phaseSeq,
        nextLabel: PHASE_LABEL[nextPhase(phase, av)],
        goToPhase,
        advance,
        quiz,
        hasQuiz,
        savedQuizProgress,
        onQuizProgress,
        onQuizContinue,
        pieces,
        hasReassemble,
        phaseTransition,
        resetReassemble,
        reassembleKey,
        onReassembleComplete,
        savedReassembleProgress,
        phaseLocked: !!phaseLock,
      }}
    >
      {children}
    </CodeStudioCtx.Provider>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-edge" aria-hidden />;
}

function RecallToolbarInline({
  blind,
  setBlind,
  peek,
  setPeek,
  score,
  timerRunning,
  setTimerRunning,
  timerLabel,
  overflowItems,
}: {
  blind: boolean;
  setBlind: (v: boolean | ((b: boolean) => boolean)) => void;
  peek: boolean;
  setPeek: (v: boolean) => void;
  score: number;
  timerRunning: boolean;
  setTimerRunning: (v: boolean | ((r: boolean) => boolean)) => void;
  timerLabel: string;
  overflowItems: { label: string; icon?: ReactNode; onClick: () => void }[];
}) {
  return (
    <>
      <ToolbarDivider />
      <PanelHeaderAction variant="toggle" active={blind} onClick={() => setBlind((b) => !b)} title="Blind recall (⌘\\)">
        {blind ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </PanelHeaderAction>
      {blind && (
        <span
          className="nodrag inline-flex"
          onMouseDown={() => setPeek(true)}
          onMouseUp={() => setPeek(false)}
          onMouseLeave={() => setPeek(false)}
        >
          <PanelHeaderAction variant="toggle" active={peek} title="Hold to peek at reference">
            <ScanEye className="h-3 w-3" />
          </PanelHeaderAction>
        </span>
      )}
      <span
        className={cn('nodrag grid h-6 min-w-[2rem] place-items-center rounded-md bg-panel2 px-1 font-mono text-ink2', chromeText.sm)}
        title={`${score}% match`}
      >
        {score}%
      </span>
      <div className="nodrag flex items-center gap-0.5">
        <PanelHeaderAction
          variant="toggle"
          active={timerRunning}
          onClick={() => setTimerRunning((r) => !r)}
          title={timerRunning ? 'Stop recall timer' : 'Start recall timer'}
        >
          <Timer className="h-3 w-3" />
        </PanelHeaderAction>
        {timerRunning && (
          <span className={cn('rounded-md bg-panel2 px-1.5 py-0.5 font-mono tabular-nums text-ink2', chromeText.sm)}>
            {timerLabel}
          </span>
        )}
      </div>
      {overflowItems.length > 0 && <PanelHeaderMenu title="More actions" items={overflowItems} />}
    </>
  );
}

/** Inline header controls — icon-only with tooltips. */
export function CodeStudioToolbar() {
  const {
    variants,
    active,
    setActive,
    blind,
    setBlind,
    peek,
    setPeek,
    copied,
    copyRef,
    persistDraft,
    skeleton,
    editorPrefs,
    setEditorPrefs,
    timerRunning,
    setTimerRunning,
    timerLabel,
    score,
    phase,
    phaseSeq,
    goToPhase,
    advance,
    nextLabel,
    hasQuiz,
    hasReassemble,
    resetReassemble,
    phaseLocked,
  } = useCodeStudio();

  if (phaseLocked) {
    const recallOverflow = [
      {
        label: copied ? 'Copied reference' : 'Copy reference',
        icon: copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />,
        onClick: () => void copyRef(),
      },
      {
        label: 'Reset to skeleton (⌘⇧R)',
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        onClick: () => persistDraft(skeleton),
      },
      {
        label: editorPrefs.vim ? 'Disable Vim (⌘⇧V)' : 'Enable Vim (⌘⇧V)',
        icon: <Keyboard className="h-3.5 w-3.5" />,
        onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
      },
      {
        label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
        icon: <WrapText className="h-3.5 w-3.5" />,
        onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
      },
    ];
    return (
      <>
        <LangTabs variants={variants} active={active} onPick={setActive} />
        {phase === 'recall' ? (
          <RecallToolbarInline
            blind={blind}
            setBlind={setBlind}
            peek={peek}
            setPeek={setPeek}
            score={score}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
            timerLabel={timerLabel}
            overflowItems={recallOverflow}
          />
        ) : (
          hasReassemble && (
            <>
              <ToolbarDivider />
              <PanelHeaderAction variant="ghost" title="Restart structure" onClick={resetReassemble}>
                <RotateCcw className="h-3 w-3" />
              </PanelHeaderAction>
            </>
          )
        )}
      </>
    );
  }

  const overflowItems =
    phase === 'recall'
      ? [
          {
            label: copied ? 'Copied reference' : 'Copy reference',
            icon: copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />,
            onClick: () => void copyRef(),
          },
          {
            label: 'Reset to skeleton (⌘⇧R)',
            icon: <RotateCcw className="h-3.5 w-3.5" />,
            onClick: () => persistDraft(skeleton),
          },
          {
            label: editorPrefs.vim ? 'Disable Vim (⌘⇧V)' : 'Enable Vim (⌘⇧V)',
            icon: <Keyboard className="h-3.5 w-3.5" />,
            onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
          },
          {
            label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
            icon: <WrapText className="h-3.5 w-3.5" />,
            onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
          },
          ...(hasReassemble
            ? [
                {
                  label: 'Restart structure phase',
                  icon: <RotateCcw className="h-3.5 w-3.5" />,
                  onClick: resetReassemble,
                },
              ]
            : []),
          ...(hasQuiz
            ? [
                {
                  label: 'Retake the quiz',
                  icon: <RotateCcw className="h-3.5 w-3.5" />,
                  onClick: () => goToPhase('quiz'),
                },
              ]
            : []),
        ]
      : [];

  const showStepper = phaseSeq.length > 1;

  return (
    <>
      <PhaseStepper seq={phaseSeq} phase={phase} onJump={goToPhase} />
      {showStepper && <ToolbarDivider />}
      <LangTabs variants={variants} active={active} onPick={setActive} />
      {phase === 'recall' ? (
        <RecallToolbarInline
          blind={blind}
          setBlind={setBlind}
          peek={peek}
          setPeek={setPeek}
          score={score}
          timerRunning={timerRunning}
          setTimerRunning={setTimerRunning}
          timerLabel={timerLabel}
          overflowItems={overflowItems}
        />
      ) : (
        <>
          <ToolbarDivider />
          <button
            type="button"
            className={cn('nodrag flex h-6 shrink-0 items-center gap-1 rounded-[calc(var(--radius)-2px)] px-2 text-ink2 hover:bg-panel2 hover:text-ink', chromeText.sm)}
            onClick={(e) => {
              e.stopPropagation();
              advance();
            }}
            title={`Skip to ${nextLabel}`}
          >
            <SkipForward className="h-3 w-3" />
            Skip to {nextLabel}
          </button>
        </>
      )}
    </>
  );
}

export function CodeStudioBody() {
  const {
    reference,
    draft,
    code,
    theme,
    editorPrefs,
    blind,
    peek,
    persistDraft,
    phase,
    phaseTransition,
    pieces,
    active,
    reassembleKey,
    onReassembleComplete,
    savedReassembleProgress,
    quiz,
    savedQuizProgress,
    onQuizProgress,
    onQuizContinue,
    nextLabel,
    setEditorPrefs,
    phaseLocked,
  } = useCodeStudio();
  const { item } = useCanvasStatic();
  const { themePreset } = useWorkspace();

  return (
    <div className="relative flex min-h-[280px] flex-1 flex-col px-3 pb-2 pt-1.5">
      <div
        key={phase}
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          phaseTransition ? 'code-studio-phase-exit' : 'code-studio-phase-enter',
        )}
      >
        {(!phaseLocked || phase === 'quiz') && phase === 'quiz' && quiz && (
          <CodeStudioQuiz
            key={`quiz-${item.id}-${active}`}
            quiz={quiz}
            initial={savedQuizProgress}
            nextLabel={nextLabel}
            onProgress={onQuizProgress}
            onContinue={onQuizContinue}
          />
        )}
        {(!phaseLocked || phase === 'reassemble') && phase === 'reassemble' && pieces && (
          <ReassemblePane
            key={reassembleKey}
            pieces={pieces}
            initialPlacedIds={savedReassembleProgress?.placedIds}
            initialTrayIds={savedReassembleProgress?.trayIds}
            initialMistakes={savedReassembleProgress?.mistakes}
            onComplete={onReassembleComplete}
            onProgress={(placedIds, trayIds, mistakes) =>
              saveReassembleProgress(item.id, active, { placedIds, trayIds, mistakes })
            }
          />
        )}
        {(!phaseLocked || phase === 'recall') && phase === 'recall' && (
          <SplitCodeEditor
            reference={reference}
            draft={draft}
            lang={code?.lang}
            dark={theme === 'dark'}
            themeKey={themePreset}
            vim={editorPrefs.vim}
            wrap={editorPrefs.wrap}
            hideLeft={blind}
            peekLeft={peek}
            splitPct={editorPrefs.splitPct}
            onSplitPctChange={(splitPct) => setEditorPrefs({ splitPct })}
            onDraftChange={persistDraft}
          />
        )}
      </div>
    </div>
  );
}

/** @deprecated use CodeStudioBody */
export function CodeStudioEditor() {
  return <CodeStudioBody />;
}

const PHASE_HINT: Record<CodeStudioPhase, string> = {
  quiz: 'Concept check — get the shape before you build',
  reassemble: 'Drag the blocks into source order',
  recall: 'Rebuild it from memory',
};

export function CodeStudioFooter() {
  const { stat, timeLabel, spaceLabel, phase } = useCodeStudio();

  return (
    <div className="nodrag flex shrink-0 flex-wrap items-center gap-2 border-t border-edge/60 px-2 py-1.5">
      <span className={cn('text-ink3', chromeText.sm)}>{PHASE_HINT[phase]}</span>
      {stat.streak > 0 && (
        <span className={cn('rounded-md bg-goodbg px-2 py-0.5 text-good', chromeText.sm)}>streak {stat.streak}</span>
      )}
      <span className="flex-1" />
      {timeLabel && (
        <span className={cn('rounded-md border border-edge bg-panel2 px-2 py-0.5 font-mono text-ink', chromeText.sm)}>
          Time {timeLabel}
        </span>
      )}
      {spaceLabel && (
        <span className={cn('rounded-md border border-edge bg-panel2 px-2 py-0.5 font-mono text-ink', chromeText.sm)}>
          Space {spaceLabel}
        </span>
      )}
      {!timeLabel && !spaceLabel && <span className={cn('text-ink3', chromeText.sm)}>No complexity in source</span>}
    </div>
  );
}
