import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { catalog, type Topic } from '../../../content';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { type MobileDeck as MobileDeckModel } from './deckModel';
import { useSpacedRepetitionDeck } from './useSpacedRepetitionDeck';
import { scheduleReview } from '@/store/persistence/srs';
import { clearMobileSession, loadMobileSession, saveMobileSession } from '../mobileSession';
import { useSwipe } from './useSwipe';
import { newQuizRunSeed } from '@/lib/quiz';
import {
  AnimateCardView,
  CompleteScreen,
  GistCardView,
  QuizCardView,
  ReadCardView,
  ReassembleCardView,
} from './MobileCards';
import { SwipeHint } from '@/components/shared';
import { readStorageJson, writeStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

function initialIndices(
  topicId: string,
  blocks: MobileDeckModel['blocks'],
  startItemId?: string,
  resumePIdx?: number,
  resumeCIdx?: number,
) {
  const clampP = (p: number) => Math.min(Math.max(0, p), Math.max(0, blocks.length - 1));
  const clampC = (pIdx: number, c: number) => {
    const max = blocks[pIdx]?.cards.length ?? 1;
    return Math.min(Math.max(0, c), Math.max(0, max - 1));
  };
  if (resumePIdx != null && resumeCIdx != null) {
    const pIdx = clampP(resumePIdx);
    return { pIdx, cIdx: clampC(pIdx, resumeCIdx) };
  }
  if (startItemId) {
    const i = blocks.findIndex((b) => b.item.id === startItemId);
    const pIdx = i >= 0 ? i : 0;
    const session = loadMobileSession();
    if (session?.topicId === topicId && session.itemId === startItemId) {
      return { pIdx, cIdx: clampC(pIdx, session.cIdx) };
    }
    return { pIdx, cIdx: 0 };
  }
  const session = loadMobileSession();
  if (session?.topicId === topicId) {
    const pIdx = clampP(session.pIdx);
    return { pIdx, cIdx: clampC(pIdx, session.cIdx) };
  }
  return { pIdx: 0, cIdx: 0 };
}

export function MobileDeck({
  topic,
  startItemId,
  initialPIdx,
  initialCIdx,
  onExit,
  onGoTopic,
  headerRight,
}: {
  topic: Topic;
  startItemId?: string;
  initialPIdx?: number;
  initialCIdx?: number;
  onExit: () => void;
  onGoTopic: (topicId: string) => void;
  headerRight?: ReactNode;
}) {
  const { enterWorkspace } = useWorkspace();
  const { deck, loading: deckLoading } = useSpacedRepetitionDeck(topic);
  const blocks = deck.blocks;
  const deckReady = !deckLoading && deck.topic === topic;

  const start = useMemo(
    () => initialIndices(topic.id, blocks, startItemId, initialPIdx, initialCIdx),
    [topic.id, blocks, startItemId, initialPIdx, initialCIdx],
  );

  const [pIdx, setPIdx] = useState(start.pIdx);
  const [cIdx, setCIdx] = useState(start.cIdx);
  // `start` is {0,0} on the first (empty) async render, so seed the real resume /
  // deep-link position once the deck resolves — before paint to avoid a flash.
  const seededRef = useRef(false);
  useLayoutEffect(() => {
    if (!deckReady || seededRef.current) return;
    seededRef.current = true;
    setPIdx(start.pIdx);
    setCIdx(start.cIdx);
  }, [deckReady, start]);
  const [dir, setDir] = useState<1 | -1>(1);
  const [quizRunSeed, setQuizRunSeed] = useState(() => newQuizRunSeed());
  const [quizAttempt, setQuizAttempt] = useState(0);
  const [quizNavLocked, setQuizNavLocked] = useState(false);
  // First-run swipe affordance: shown only on the very first card until the
  // user moves once, then persisted as seen so it never reappears.
  const [showSwipeHint, setShowSwipeHint] = useState(
    () => !readStorageJson<boolean>(STORAGE_KEYS.MOBILE_SWIPE_HINT_SEEN, false),
  );
  const done = pIdx >= blocks.length;
  const block = done ? null : blocks[pIdx];
  const card = block?.cards[cIdx];

  // Fresh shuffle per problem so Q1 order does not repeat across the deck.
  useEffect(() => {
    setQuizRunSeed(newQuizRunSeed());
    setQuizAttempt(0);
  }, [pIdx]);

  // Dismiss + remember the swipe hint the moment the learner moves off card 1.
  useEffect(() => {
    if (showSwipeHint && (pIdx !== 0 || cIdx !== 0)) {
      writeStorageJson(STORAGE_KEYS.MOBILE_SWIPE_HINT_SEEN, true);
      setShowSwipeHint(false);
    }
  }, [showSwipeHint, pIdx, cIdx]);

  useEffect(() => {
    if (done) {
      clearMobileSession();
      return;
    }
    const itemId = blocks[pIdx]?.item.id;
    saveMobileSession({
      topicId: topic.id,
      ...(itemId !== undefined ? { itemId } : {}),
      pIdx,
      cIdx,
    });
  }, [topic.id, pIdx, cIdx, done, blocks]);

  const advance = useCallback(() => {
    const b = blocks[pIdx];
    if (!b) return;
    setDir(1);
    if (cIdx < b.cards.length - 1) {
      setCIdx(cIdx + 1);
    } else {
      setCIdx(0);
      setPIdx(pIdx + 1);
    }
  }, [blocks, pIdx, cIdx]);

  const back = useCallback(() => {
    setDir(-1);
    if (cIdx > 0) {
      setCIdx(cIdx - 1);
      return;
    }
    if (pIdx > 0) {
      const prev = blocks[pIdx - 1];
      if (!prev) return;
      setPIdx(pIdx - 1);
      setCIdx(Math.max(0, prev.cards.length - 1));
    }
  }, [blocks, cIdx, pIdx]);

  const goToNextProblem = useCallback(() => {
    if (pIdx >= blocks.length - 1) return;
    setDir(1);
    setCIdx(0);
    setPIdx(pIdx + 1);
  }, [blocks.length, pIdx]);

  const canNextProblem = !done && pIdx < blocks.length - 1;

  const goToCard = useCallback(
    (targetCIdx: number) => {
      if (!block) return;
      const clamped = Math.min(Math.max(0, targetCIdx), block.cards.length - 1);
      if (clamped === cIdx) return;
      setDir(clamped > cIdx ? 1 : -1);
      setCIdx(clamped);
    },
    [block, cIdx],
  );

  const restartQuiz = useCallback(() => {
    const b = blocks[pIdx];
    if (!b) return;
    const firstQuiz = b.cards.findIndex((c) => c.kind === 'quiz');
    if (firstQuiz < 0) return;
    setDir(1);
    setCIdx(firstQuiz);
    setQuizRunSeed(newQuizRunSeed());
    setQuizAttempt((n) => n + 1);
  }, [blocks, pIdx]);

  const onAnswered = useCallback(
    (correct: boolean) => {
      const itemId = blocks[pIdx]?.item.id;
      if (itemId) scheduleReview(itemId, correct);
    },
    [blocks, pIdx],
  );

  const restart = useCallback(() => {
    setDir(1);
    setPIdx(0);
    setCIdx(0);
    setQuizRunSeed(newQuizRunSeed());
    setQuizAttempt(0);
  }, []);

  const handleFinishExit = useCallback(() => {
    clearMobileSession();
    onExit();
  }, [onExit]);

  const openStudio = useCallback(() => {
    if (!block) return;
    saveMobileSession({ topicId: topic.id, itemId: block.item.id, pIdx, cIdx });
    enterWorkspace(block.item.id);
  }, [block, topic.id, pIdx, cIdx, enterWorkspace]);

  const swipe = useSwipe({ onNext: advance, onPrev: back, enabled: !done && !quizNavLocked });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (quizNavLocked) return;
      const t = e.target;
      if (isEditableTarget(t) || (t instanceof HTMLElement && t.closest('[data-noswipe]'))) {
        return;
      }
      if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, back, onExit, quizNavLocked]);

  const course = catalog.courses.find((c) => c.id === topic.courseId);
  const tIdx = course ? course.topics.findIndex((t) => t.id === topic.id) : -1;
  const nextTopic = course && tIdx >= 0 ? course.topics[tIdx + 1] : undefined;

  if (!deckReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="relative grid h-16 w-16 place-items-center rounded-3xl border border-edge bg-panel/80 shadow-theme-md">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-accent" />
        </div>
        <div>
          <p className="text-[length:var(--fs-title)] font-semibold text-ink">Preparing deck</p>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink3">Loading {topic.title}…</p>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl border border-edge bg-panel/80 text-ink3 shadow-theme-md">
          <Layers className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[length:var(--fs-title)] font-semibold text-ink">
            No drillable problems here yet
          </p>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink3">
            Pick another category to keep practicing.
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-accent px-5 py-2.5 text-[length:var(--fs)] font-semibold text-[var(--accent-contrast)] shadow-theme-sm"
        >
          Back to categories
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-density="ultra">
      <div className="shrink-0 border-b border-edge bg-[var(--surface-glass)] px-3 py-2 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="relative grid h-8 w-8 place-items-center rounded-full text-ink3 before:absolute before:-inset-1.5 before:content-[''] hover:bg-panel2 hover:text-ink"
            aria-label="Back to categories"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-0.5">
              <div className="truncate text-[length:var(--fs-sm)] font-semibold text-ink">
                {block?.item.title ?? topic.title}
              </div>
              {canNextProblem && (
                <button
                  type="button"
                  onClick={goToNextProblem}
                  title="Next problem"
                  aria-label="Next problem"
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink3 before:absolute before:-inset-1.5 before:content-[''] hover:bg-panel2 hover:text-ink"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="truncate text-[length:var(--fs-tight)] text-ink3">
              {done ? 'Topic complete' : `${topic.title} · Problem ${pIdx + 1} of ${blocks.length}`}
            </div>
          </div>
          {headerRight}
        </div>
        {!done && block && (
          <div
            className="mt-2 flex items-center gap-1"
            role="progressbar"
            aria-valuenow={cIdx + 1}
            aria-valuemin={1}
            aria-valuemax={block.cards.length}
            aria-label={`Step ${cIdx + 1} of ${block.cards.length}`}
          >
            {block.cards.map((c, i) => (
              <span
                key={c.key}
                className={cn(
                  'mobile-progress-step-wrap h-1 flex-1 overflow-hidden rounded-full',
                  c.kind === 'quiz' ? 'mobile-progress-step-wrap--quiz' : undefined,
                  i === cIdx ? 'animate' : undefined,
                )}
              >
                <span
                  className={cn(
                    'mobile-progress-step block h-full rounded-full transition-all duration-300',
                    i === cIdx ? 'mobile-progress-step--active' : '',
                    c.kind === 'quiz' ? 'mobile-progress-step--quiz' : '',
                  )}
                  style={{
                    width: i < cIdx ? '100%' : i === cIdx ? '60%' : '0%',
                    background:
                      i <= cIdx
                        ? c.kind === 'quiz'
                          ? 'var(--good)'
                          : 'var(--accent)'
                        : 'transparent',
                  }}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        {...swipe.bind}
        className="mobile-deck-viewport relative flex min-h-0 flex-1 flex-col"
        style={{ touchAction: 'pan-y' }}
      >
        <div
          key={done ? 'done' : `${pIdx}:${cIdx}`}
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            !swipe.dragging && (dir === 1 ? 'mobile-card-enter-next' : 'mobile-card-enter-prev'),
          )}
          style={
            swipe.dragging
              ? {
                  transform: `translateX(${swipe.dx}px)`,
                  opacity: 1 - Math.min(Math.abs(swipe.dx) / 520, 0.3),
                }
              : undefined
          }
        >
          {done ? (
            <CompleteScreen
              topicTitle={topic.title}
              totalQuiz={deck.totalQuiz}
              problemCount={blocks.length}
              onRestart={restart}
              onExit={handleFinishExit}
              {...(nextTopic
                ? {
                    onNextCategory: () => onGoTopic(nextTopic.id),
                    nextCategoryTitle: nextTopic.title,
                  }
                : {})}
            />
          ) : block && card?.kind === 'gist' ? (
            <GistCardView
              card={card}
              block={block}
              problemIndex={pIdx}
              problemCount={blocks.length}
              onContinue={advance}
            />
          ) : block && card?.kind === 'read' ? (
            <ReadCardView
              block={block}
              problemIndex={pIdx}
              problemCount={blocks.length}
              onContinue={advance}
              onOpenStudio={openStudio}
            />
          ) : block && card?.kind === 'animate' ? (
            <AnimateCardView
              block={block}
              problemIndex={pIdx}
              problemCount={blocks.length}
              onContinue={advance}
              onOpenStudio={openStudio}
            />
          ) : block && card?.kind === 'quiz' ? (
            <QuizCardView
              card={card}
              block={block}
              quizRunSeed={quizRunSeed}
              quizAttempt={quizAttempt}
              onAnswered={onAnswered}
              onAdvance={advance}
              onRestartQuiz={restartQuiz}
              onNavLockChange={setQuizNavLocked}
              onPrev={back}
              onNext={advance}
              canPrev={pIdx > 0 || cIdx > 0}
              canNext={cIdx < block.cards.length - 1 || pIdx < blocks.length - 1}
              onGoToQuestion={(qIndex) => {
                const i = block.cards.findIndex((c) => c.kind === 'quiz' && c.qIndex === qIndex);
                if (i >= 0) goToCard(i);
              }}
            />
          ) : block && card?.kind === 'reassemble' ? (
            <ReassembleCardView
              card={card}
              block={block}
              onComplete={advance}
              onSkip={advance}
              onOpenStudio={openStudio}
            />
          ) : null}
        </div>
      </div>

      {showSwipeHint && !done && pIdx === 0 && cIdx === 0 && (
        <div className="shrink-0 pb-2">
          <SwipeHint message="Swipe left or right to move between cards" />
        </div>
      )}
    </div>
  );
}
