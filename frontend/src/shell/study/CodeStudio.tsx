import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EditorView } from '@codemirror/view';
import { useCanvasStatic, useQuizHostRelay } from '@/shell/canvas';
import { ReassemblePane } from '../../components/puzzle/ReassemblePane';
import { CodeStudioQuiz } from './CodeStudioQuiz';
import { patternsForTags } from '../../content';
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
import { codeVariants } from '@/shell/panels/shared/codeVariants';
import {
  CodeStudioContentContext,
  CodeStudioDraftContext,
  CodeStudioEditorContext,
  CodeStudioPhaseContext,
} from './hooks/codeStudioContextStore';
import {
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
  useCodeStudioPhase,
} from './hooks/useCodeStudio';
import { useCodeStudioTimer } from './hooks/useCodeStudioTimer';
import { useCodeStudioRecallShortcuts } from './hooks/useCodeStudioRecallShortcuts';
import { useCodeStudioMachine } from './hooks/useCodeStudioMachine';
import { RecallEditorShell } from './components/RecallEditorShell';

export {
  useCodeStudio,
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
  useCodeStudioPhase,
} from './hooks/useCodeStudio';

export { CodeStudioToolbar } from './components/CodeStudioHeader';

const PHASE_LABEL: Record<CodeStudioPhase, string> = {
  quiz: 'Quiz',
  reassemble: 'Structure',
  recall: 'Recall',
};

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
  const draftViewRef = useRef<EditorView | null>(null);
  const formatBothRef = useRef<(() => void) | null>(null);
  const foldBothRef = useRef<{ collapse: () => void; expand: () => void } | null>(null);
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
    persistDraft,
    setBlind,
    fontSize: editorPrefs.fontSize,
    setEditorPrefs,
  });

  const copyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard unavailable */
    }
  }, [reference]);

  const contentValue = useMemo(
    () => ({
      variants,
      active,
      setActive,
      code,
      reference,
      timeLabel,
      spaceLabel,
      stat,
      theme: (theme === 'dark' ? 'dark' : 'light') as 'dark' | 'light',
    }),
    [variants, active, code, reference, timeLabel, spaceLabel, stat, theme],
  );

  const phaseValue = useMemo(
    () => ({
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
    }),
    [
      phase,
      phaseSeq,
      av,
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
      phaseLock,
    ],
  );

  const draftValue = useMemo(
    () => ({
      draft,
      persistDraft,
      blind,
      setBlind,
      peek,
      setPeek,
      timerRunning,
      setTimerRunning,
      timerLabel,
      score,
    }),
    [draft, persistDraft, blind, peek, timerRunning, timerLabel, score],
  );

  const editorValue = useMemo(
    () => ({
      editorPrefs,
      setEditorPrefs,
      copied,
      copyRef,
      draftViewRef,
      formatBothRef,
      foldBothRef,
    }),
    [editorPrefs, setEditorPrefs, copied, copyRef],
  );

  if (variants.length === 0) {
    return (
      <p className={cn('px-3 py-2 text-ink3', chromeText.base)}>No source for this problem.</p>
    );
  }

  return (
    <CodeStudioContentContext.Provider value={contentValue}>
      <CodeStudioPhaseContext.Provider value={phaseValue}>
        <CodeStudioDraftContext.Provider value={draftValue}>
          <CodeStudioEditorContext.Provider value={editorValue}>
            {children}
          </CodeStudioEditorContext.Provider>
        </CodeStudioDraftContext.Provider>
      </CodeStudioPhaseContext.Provider>
    </CodeStudioContentContext.Provider>
  );
}

export function CodeStudioBody() {
  const { reference, code, theme, active } = useCodeStudioContent();
  const { draft, blind, peek, persistDraft } = useCodeStudioDraft();
  const { editorPrefs, setEditorPrefs, draftViewRef, formatBothRef, foldBothRef } =
    useCodeStudioEditor();
  const {
    phase,
    phaseTransition,
    pieces,
    reassembleKey,
    onReassembleComplete,
    savedReassembleProgress,
    quiz,
    savedQuizProgress,
    onQuizProgress,
    onQuizContinue,
    nextLabel,
    phaseLocked,
  } = useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const { themePreset } = useWorkspace();
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);

  return (
    <div className="relative flex min-h-[280px] flex-1 flex-col px-3 pb-2 pt-1.5">
      <div
        key={phase}
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
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
          <RecallEditorShell
            reference={reference}
            draft={draft}
            lang={code?.lang}
            dark={theme === 'dark'}
            themeKey={themePreset}
            editorPrefs={editorPrefs}
            setEditorPrefs={setEditorPrefs}
            blind={blind}
            peek={peek}
            onDraftChange={persistDraft}
            compact={editorPrefs.recallCompact}
            draftViewRef={draftViewRef}
            formatBothRef={formatBothRef}
            foldBothRef={foldBothRef}
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
  const { stat, timeLabel, spaceLabel } = useCodeStudioContent();
  const { score, timerRunning, timerLabel } = useCodeStudioDraft();
  const { phase } = useCodeStudioPhase();

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
        <span
          className={cn(
            'rounded-md bg-panel2 px-2 py-0.5 font-mono tabular-nums text-ink2',
            chromeText.sm,
          )}
        >
          {timerLabel}
        </span>
      )}
      {stat.streak > 0 && (
        <span className={cn('rounded-md bg-goodbg px-2 py-0.5 text-good', chromeText.sm)}>
          streak {stat.streak}
        </span>
      )}
      <span className="flex-1" />
      {timeLabel && (
        <span
          className={cn(
            'rounded-md border border-edge bg-panel2 px-2 py-0.5 font-mono text-ink',
            chromeText.sm,
          )}
        >
          Time {timeLabel}
        </span>
      )}
      {spaceLabel && (
        <span
          className={cn(
            'rounded-md border border-edge bg-panel2 px-2 py-0.5 font-mono text-ink',
            chromeText.sm,
          )}
        >
          Space {spaceLabel}
        </span>
      )}
      {!timeLabel && !spaceLabel && (
        <span className={cn('text-ink3', chromeText.sm)}>No complexity in source</span>
      )}
    </div>
  );
}
