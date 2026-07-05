import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
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
import { ReassemblePane } from '../../components/puzzle/ReassemblePane';
import { SplitCodeEditor } from '../../components/code/SplitCodeEditor';
import { CodeStudioQuiz } from './CodeStudioQuiz';
import { patternsForTags } from '../../content';
import { extractSkeleton } from '@/lib/code';
import { resolveCodePieces } from '@/lib/code';
import {
  nextPhase,
  phaseSequence,
  saveReassembleProgress,
  type CodeStudioPhase,
  type PhaseAvailability,
} from '@/store/user-prefs';
import { matchScore } from '@/lib/code';
import { useEditorPrefs } from '@/store/user-prefs';
import { parseComplexity } from '@/lib/quiz';
import { useProgress, statFor } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';
import { COPY_FEEDBACK_MS } from '../copyFeedback';
import { useWorkspace } from '@/store/workspace';
import { useCanvasStatic } from '../canvas/CanvasContext';
import { nodeIconGlyph, PanelHeaderAction, PanelHeaderMenu } from '../canvas/ui/nodeui';
import { codeVariants, HeaderLangTabs } from '@/shell/panels/shared/codeVariants';
import { CodeStudioContext } from './hooks/codeStudioContextStore';
import { useCodeStudio } from './hooks/useCodeStudio';
import { useCodeStudioTimer } from './hooks/useCodeStudioTimer';
import { useCodeStudioRecallShortcuts } from './hooks/useCodeStudioRecallShortcuts';
import { useCodeStudioMachine } from './hooks/useCodeStudioMachine';
import { useQuizHostRelay } from '@/shell/canvas/collab/sync/useQuizHostRelay';

export { useCodeStudio } from './hooks/useCodeStudio';

const PHASE_LABEL: Record<CodeStudioPhase, string> = {
  quiz: 'Quiz',
  reassemble: 'Structure',
  recall: 'Recall',
};

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
  const { timerRunning, setTimerRunning, setTimerSec, timerLabel } = useCodeStudioTimer(item.id);

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

  const draftKey = STORAGE_KEYS.DRAFT(item.id, active);
  const skeleton = useMemo(() => (reference ? extractSkeleton(reference) : ''), [reference]);

  const {
    phase,
    draft,
    persistDraft,
    phaseTransition,
    reassembleKey,
    goToPhase,
    advance,
    resetReassemble,
    onReassembleComplete,
    onQuizProgress,
    onQuizContinue,
    savedReassembleProgress,
    savedQuizProgress,
  } = useCodeStudioMachine({
    itemId: item.id,
    active,
    av,
    skeleton,
    reference,
    draftKey,
    phaseLock,
    setTimerRunning,
    setTimerSec,
  });

  const score = reference ? matchScore(reference, draft) : 0;
  const parsed = parseComplexity(reference);
  const cards = patternsForTags(item.tags);
  const fallbackTime = cards.map((c) => c.complexity.match(/O\([^)]*\)/)?.[0]).find(Boolean);
  const timeLabel = parsed.time ?? fallbackTime;
  const spaceLabel = parsed.space;

  useCodeStudioRecallShortcuts({
    phase,
    skeleton,
    persistDraft,
    vim: editorPrefs.vim,
    setEditorPrefs,
    setBlind,
  });

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (variants.length === 0) {
    return <p className={cn('px-3 py-2 text-ink3', chromeText.base)}>No source for this problem.</p>;
  }

  return (
    <CodeStudioContext.Provider
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
    </CodeStudioContext.Provider>
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
  overflowItems,
}: {
  blind: boolean;
  setBlind: (v: boolean | ((b: boolean) => boolean)) => void;
  peek: boolean;
  setPeek: (v: boolean) => void;
  overflowItems: { label: string; icon?: ReactNode; onClick: () => void }[];
}) {
  return (
    <>
      <ToolbarDivider />
      <PanelHeaderAction variant="toggle" active={blind} onClick={() => setBlind((b) => !b)} title="Blind recall (⌘\\)">
        {blind ? <EyeOff className={nodeIconGlyph} /> : <Eye className={nodeIconGlyph} />}
      </PanelHeaderAction>
      {blind && (
        <span
          className="nodrag inline-flex"
          onMouseDown={() => setPeek(true)}
          onMouseUp={() => setPeek(false)}
          onMouseLeave={() => setPeek(false)}
        >
          <PanelHeaderAction variant="toggle" active={peek} title="Hold to peek at reference">
            <ScanEye className={nodeIconGlyph} />
          </PanelHeaderAction>
        </span>
      )}
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
        icon: copied ? <Check className={nodeIconGlyph} /> : <Copy className={nodeIconGlyph} />,
        onClick: () => void copyRef(),
      },
      {
        label: 'Reset to skeleton (⌘⇧R)',
        icon: <RotateCcw className={nodeIconGlyph} />,
        onClick: () => persistDraft(skeleton),
      },
      {
        label: editorPrefs.vim ? 'Disable Vim (⌘⇧V)' : 'Enable Vim (⌘⇧V)',
        icon: <Keyboard className={nodeIconGlyph} />,
        onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
      },
      {
        label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
        icon: <WrapText className={nodeIconGlyph} />,
        onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
      },
      ...(phase === 'recall'
        ? [
            {
              label: timerRunning ? 'Stop recall timer' : 'Start recall timer',
              icon: <Timer className={nodeIconGlyph} />,
              onClick: () => setTimerRunning((r) => !r),
            },
          ]
        : []),
    ];
    return (
      <>
        <HeaderLangTabs variants={variants} active={active} onPick={setActive} />
        {phase === 'recall' ? (
          <RecallToolbarInline
            blind={blind}
            setBlind={setBlind}
            peek={peek}
            setPeek={setPeek}
            overflowItems={recallOverflow}
          />
        ) : (
          hasReassemble && (
            <>
              <ToolbarDivider />
              <PanelHeaderAction variant="ghost" title="Restart structure" onClick={resetReassemble}>
                <RotateCcw className={nodeIconGlyph} />
              </PanelHeaderAction>
            </>
          )
        )}
      </>
    );
  }

  const recallOverflow = [
    {
      label: copied ? 'Copied reference' : 'Copy reference',
      icon: copied ? <Check className={nodeIconGlyph} /> : <Copy className={nodeIconGlyph} />,
      onClick: () => void copyRef(),
    },
    {
      label: 'Reset to skeleton (⌘⇧R)',
      icon: <RotateCcw className={nodeIconGlyph} />,
      onClick: () => persistDraft(skeleton),
    },
    {
      label: editorPrefs.vim ? 'Disable Vim (⌘⇧V)' : 'Enable Vim (⌘⇧V)',
      icon: <Keyboard className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
    },
    {
      label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
      icon: <WrapText className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
    },
    {
      label: timerRunning ? 'Stop recall timer' : 'Start recall timer',
      icon: <Timer className={nodeIconGlyph} />,
      onClick: () => setTimerRunning((r) => !r),
    },
    ...(hasReassemble
      ? [
          {
            label: 'Restart structure phase',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: resetReassemble,
          },
        ]
      : []),
    ...(hasQuiz
      ? [
          {
            label: 'Retake the quiz',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: () => goToPhase('quiz'),
          },
        ]
      : []),
  ];

  const structureOverflow = [
    {
      label: editorPrefs.vim ? 'Disable Vim (⌘⇧V)' : 'Enable Vim (⌘⇧V)',
      icon: <Keyboard className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
    },
    {
      label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
      icon: <WrapText className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
    },
    ...(hasQuiz
      ? [
          {
            label: 'Retake the quiz',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: () => goToPhase('quiz'),
          },
        ]
      : []),
  ];

  const showStepper = phaseSeq.length > 1;

  return (
    <>
      <PhaseStepper seq={phaseSeq} phase={phase} onJump={goToPhase} />
      {showStepper && <ToolbarDivider />}
      <HeaderLangTabs variants={variants} active={active} onPick={setActive} />
      {phase === 'recall' ? (
        <RecallToolbarInline
          blind={blind}
          setBlind={setBlind}
          peek={peek}
          setPeek={setPeek}
          overflowItems={recallOverflow}
        />
      ) : (
        <>
          <ToolbarDivider />
          <PanelHeaderAction variant="ghost" title={`Skip to ${nextLabel}`} onClick={() => advance()}>
            <SkipForward className={nodeIconGlyph} />
          </PanelHeaderAction>
          {hasReassemble && (
            <PanelHeaderAction variant="ghost" title="Restart structure" onClick={resetReassemble}>
              <RotateCcw className={nodeIconGlyph} />
            </PanelHeaderAction>
          )}
          {!hasReassemble && hasQuiz && (
            <PanelHeaderAction variant="ghost" title="Retake the quiz" onClick={() => goToPhase('quiz')}>
              <RotateCcw className={nodeIconGlyph} />
            </PanelHeaderAction>
          )}
          <PanelHeaderMenu title="More actions" items={structureOverflow} />
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
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);

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
            itemId={item.id}
            initial={savedQuizProgress}
            nextLabel={nextLabel}
            onProgress={onQuizProgress}
            onContinue={onQuizContinue}
            onAnswer={relayQuizAnswer}
          />
        )}
        {(!phaseLocked || phase === 'reassemble') && phase === 'reassemble' && pieces && (
          <ReassemblePane
            key={reassembleKey}
            pieces={pieces}
            lang={code?.lang ?? 'go'}
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

const PHASE_HINT: Record<CodeStudioPhase, string> = {
  quiz: 'Concept check — get the shape before you build',
  reassemble: 'Drag the blocks into source order',
  recall: 'Rebuild it from memory',
};

export function CodeStudioFooter() {
  const { stat, timeLabel, spaceLabel, phase, score, timerRunning, timerLabel } = useCodeStudio();

  return (
    <div className="nodrag flex shrink-0 flex-wrap items-center gap-2 border-t border-edge/60 px-2 py-1.5">
      <span className={cn('text-ink3', chromeText.sm)}>{PHASE_HINT[phase]}</span>
      {phase === 'recall' && (
        <span
          className={cn('rounded-md bg-panel2 px-2 py-0.5 font-mono text-ink2', chromeText.sm)}
          title={`${score}% match`}
        >
          {score}% match
        </span>
      )}
      {phase === 'recall' && timerRunning && (
        <span className={cn('rounded-md bg-panel2 px-2 py-0.5 font-mono tabular-nums text-ink2', chromeText.sm)}>
          {timerLabel}
        </span>
      )}
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
