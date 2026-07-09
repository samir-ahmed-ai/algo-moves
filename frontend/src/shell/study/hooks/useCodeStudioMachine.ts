import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { type CodePiece } from '@/lib/code';
import {
  clearQuizProgress,
  clearReassembleProgress,
  loadPhase,
  loadQuizProgress,
  loadReassembleProgress,
  nextPhase,
  savePhase,
  saveQuizProgress,
  type CodeStudioPhase,
  type PhaseAvailability,
  type QuizProgress,
} from '@/store/user-prefs';
import { usePhaseTransition } from './usePhaseTransition';
import { loadPersistedDraft, savePersistedDraft } from '@/store/persistence/draftPersistence';
import { recordAttempt, scheduleReviewRating } from '@/store/persistence';
import { Rating } from 'ts-fsrs';

/**
 * The Code Studio phase state machine (Quiz → Structure → Recall), extracted from
 * CodeStudioProvider. Owns the phase, the working draft, the reassemble key and the
 * cross-fade transition; drives persistence and progress; and coordinates the recall
 * stopwatch via the setters passed in. Behaviour is unchanged from the inline version.
 */
export function useCodeStudioMachine({
  itemId,
  active,
  av,
  draftKey,
  phaseLock,
  setTimerRunning,
  setTimerSec,
}: {
  itemId: string;
  active: number;
  av: PhaseAvailability;
  draftKey: string;
  phaseLock?: CodeStudioPhase;
  setTimerRunning: Dispatch<SetStateAction<boolean>>;
  setTimerSec: Dispatch<SetStateAction<number>>;
}) {
  const { scheduleTransition, clearTransition } = usePhaseTransition();
  const [phaseTransition, setPhaseTransition] = useState(false);
  const [reassembleKey, setReassembleKey] = useState(0);
  const [recallRated, setRecallRated] = useState(false);

  const [phase, setPhase] = useState<CodeStudioPhase>(
    () => phaseLock ?? loadPhase(itemId, active, av),
  );

  const loadDraft = useCallback(
    (opts?: { itemSwitch?: boolean }) => loadPersistedDraft(draftKey, opts),
    [draftKey],
  );

  const [draft, setDraft] = useState<string>(() => loadDraft());

  useEffect(() => {
    clearTransition();
    setPhaseTransition(false);
    setDraft(loadDraft({ itemSwitch: true }));
    setPhase(phaseLock ?? loadPhase(itemId, active, av));
    setReassembleKey((k) => k + 1);
    setRecallRated(false);
  }, [loadDraft, itemId, active, av, clearTransition, phaseLock]);

  const persistDraft = useCallback(
    (v: string) => {
      setDraft(v);
      savePersistedDraft(draftKey, v);
    },
    [draftKey],
  );

  // Reconcile the shared draft key across tabs/windows: another document editing the
  // same attempt writes localStorage and fires a `storage` event here (never in the
  // writing document), so we adopt its value instead of clobbering it on the next save.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== draftKey) return;
      if (e.storageArea && e.storageArea !== globalThis.localStorage) return;
      const next = e.newValue ?? '';
      setDraft((cur) => (cur === next ? cur : next));
    };
    globalThis.addEventListener('storage', onStorage);
    return () => globalThis.removeEventListener('storage', onStorage);
  }, [draftKey]);

  const enterRecall = useCallback(
    (startTimer = true) => {
      setPhaseTransition(true);
      // Resume, don't wipe: keep any in-progress/saved attempt. The only intentional wipe is
      // the explicit "Clear draft" action (⌘⇧R / Session menu). Wiping here silently destroyed
      // typed recall on every re-entry (data loss).
      savePhase(itemId, active, 'recall');
      clearReassembleProgress(itemId, active);
      scheduleTransition(() => {
        setPhase('recall');
        setPhaseTransition(false);
        if (startTimer) setTimerRunning(true);
      });
    },
    [itemId, active, scheduleTransition, setTimerRunning],
  );

  /** Animated, persisted jump to any phase (stepper navigation). Re-entering the
   *  quiz is a fresh restart, so its saved progress is cleared first. */
  const goToPhase = useCallback(
    (target: CodeStudioPhase) => {
      if (phaseLock) return;
      if (target === phase) return;
      if (target === 'quiz') clearQuizProgress(itemId, active);
      // Re-entering recall via the stepper resumes the saved attempt (no wipe) — data loss fix.
      setPhaseTransition(true);
      savePhase(itemId, active, target);
      if (target !== 'recall') {
        setTimerRunning(false);
        setTimerSec(0);
      }
      scheduleTransition(() => {
        setPhase(target);
        setPhaseTransition(false);
      });
    },
    [phaseLock, phase, itemId, active, scheduleTransition, setTimerRunning, setTimerSec],
  );

  /** Skip / continue to the next phase in the sequence. */
  const advance = useCallback(() => {
    if (phaseLock) return;
    const target = nextPhase(phase, av);
    if (target === phase) return;
    if (target === 'recall') enterRecall(false);
    else goToPhase(target);
  }, [phaseLock, phase, av, enterRecall, goToPhase]);

  const resetReassemble = useCallback(() => {
    clearReassembleProgress(itemId, active);
    savePhase(itemId, active, 'reassemble');
    setPhase('reassemble');
    setReassembleKey((k) => k + 1);
    setTimerRunning(false);
    setTimerSec(0);
  }, [itemId, active, setTimerRunning, setTimerSec]);

  const onReassembleComplete = useCallback(
    (_placed: CodePiece[], mistakes: number) => {
      if (mistakes <= 3) recordAttempt(itemId, true);
      if (phaseLock === 'reassemble') return;
      enterRecall(true);
    },
    [enterRecall, itemId, phaseLock],
  );

  /**
   * Grade a from-memory recall via the learner's self-rating (Again/Hard/Good/Easy).
   * The rating is authoritative: it records the attempt AND schedules the next FSRS
   * review. `recallRated` (reset on item switch) guards against double-counting a
   * single recall session.
   */
  const onRecallComplete = useCallback(
    (rating: Rating) => {
      if (recallRated) return;
      recordAttempt(itemId, rating >= Rating.Good);
      scheduleReviewRating(itemId, rating);
      setTimerRunning(false);
      setRecallRated(true);
    },
    [itemId, recallRated, setTimerRunning],
  );

  const onQuizProgress = useCallback(
    (p: QuizProgress) => saveQuizProgress(itemId, active, p),
    [itemId, active],
  );

  const onQuizContinue = useCallback(() => {
    const target = nextPhase('quiz', av);
    if (target === 'recall') enterRecall(false);
    else goToPhase(target);
  }, [av, enterRecall, goToPhase]);

  const savedReassembleProgress = useMemo(
    () => (phase === 'reassemble' ? loadReassembleProgress(itemId, active) : null),
    [phase, itemId, active, reassembleKey],
  );

  const savedQuizProgress = useMemo(() => loadQuizProgress(itemId, active), [itemId, active]);

  return {
    phase,
    draft,
    persistDraft,
    phaseTransition,
    reassembleKey,
    goToPhase,
    advance,
    resetReassemble,
    onReassembleComplete,
    onRecallComplete,
    recallRated,
    onQuizProgress,
    onQuizContinue,
    savedReassembleProgress,
    savedQuizProgress,
  };
}
