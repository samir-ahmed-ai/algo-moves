import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, Layers } from 'lucide-react';
import { catalog, type Topic } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { buildDeck } from './deckModel';
import { clearMobileSession, loadMobileSession, saveMobileSession } from './mobileSession';
import { useSwipe } from './useSwipe';
import { newQuizRunSeed } from '@/lib/quiz';
import { AnimateCardView, CompleteScreen, GistCardView, QuizCardView, ReassembleCardView } from './MobileCards';

function initialIndices(
  topicId: string,
  blocks: ReturnType<typeof buildDeck>['blocks'],
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
  const deck = useMemo(() => buildDeck(topic), [topic]);
  const { blocks } = deck;

  const start = useMemo(
    () => initialIndices(topic.id, blocks, startItemId, initialPIdx, initialCIdx),
    [topic.id, blocks, startItemId, initialPIdx, initialCIdx],
  );

  const [pIdx, setPIdx] = useState(start.pIdx);
  const [cIdx, setCIdx] = useState(start.cIdx);
  const [dir, setDir] = useState<1 | -1>(1);
  const [quizRunSeed, setQuizRunSeed] = useState(() => newQuizRunSeed());
  const [quizAttempt, setQuizAttempt] = useState(0);
  const [quizNavLocked, setQuizNavLocked] = useState(false);
  const done = pIdx >= blocks.length;
  const block = done ? null : blocks[pIdx];
  const card = block?.cards[cIdx];
  const deckStats = useMemo(() => {
    let totalCards = 0;
    const startsByProblem = blocks.map((b) => {
      const start = totalCards;
      totalCards += b.cards.length;
      return start;
    });
    return { totalCards, startsByProblem };
  }, [blocks]);
  const problemStartIdx = deckStats.startsByProblem[pIdx] ?? 0;
  const globalCardIndex = done ? deckStats.totalCards : problemStartIdx + cIdx + 1;

  // Fresh shuffle per problem so Q1 order does not repeat across the deck.
  useEffect(() => {
    setQuizRunSeed(newQuizRunSeed());
    setQuizAttempt(0);
  }, [pIdx]);

  useEffect(() => {
    if (done) {
      clearMobileSession();
      return;
    }
    const itemId = blocks[pIdx]?.item.id;
    saveMobileSession({ topicId: topic.id, itemId, pIdx, cIdx });
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
      setPIdx(pIdx - 1);
      setCIdx(Math.max(0, prev.cards.length - 1));
    }
  }, [blocks, cIdx, pIdx]);

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

  const onAnswered = useCallback((_correct: boolean) => {
    // QuizCardView calls recordAttempt internally; hook kept for future session stats.
  }, []);

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
      if (
        t instanceof HTMLElement &&
        (t.closest('[data-noswipe]') ||
          t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
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

  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Layers className="h-10 w-10 text-ink3" />
        <p className="text-[15px] font-medium text-ink2">No drillable problems here yet</p>
        <button type="button" onClick={onExit} className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white">
          Back to categories
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pt-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onExit} className="grid h-8 w-8 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{topic.title}</div>
            <div className="text-[11px] text-ink3">{done ? 'Topic complete' : `Problem ${pIdx + 1} of ${blocks.length}`}</div>
            {!done && (
              <div className="text-[10px] text-ink3">
                Card {globalCardIndex} of {deckStats.totalCards} · {block?.cards[cIdx]?.kind ?? 'card'}
              </div>
            )}
          </div>
          {headerRight}
        </div>
        {!done && block && (
          <div className="mt-2 flex items-center gap-1" role="progressbar" aria-valuenow={cIdx + 1} aria-valuemin={1} aria-valuemax={block.cards.length} aria-label={`Step ${cIdx + 1} of ${block.cards.length}`}>
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
                    background: i <= cIdx ? (c.kind === 'quiz' ? 'var(--good)' : 'var(--accent)') : 'transparent',
                  }}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      <div {...swipe.bind} className="mobile-deck-viewport relative flex min-h-0 flex-1 flex-col" style={{ touchAction: 'pan-y' }}>
        <div
          key={done ? 'done' : `${pIdx}:${cIdx}`}
          className={cn('flex min-h-0 flex-1 flex-col', !swipe.dragging && (dir === 1 ? 'mobile-card-enter-next' : 'mobile-card-enter-prev'))}
          style={
            swipe.dragging
              ? { transform: `translateX(${swipe.dx}px)`, opacity: 1 - Math.min(Math.abs(swipe.dx) / 520, 0.3) }
              : undefined
          }
        >
          {done ? (
            <CompleteScreen
              topicTitle={topic.title}
              onRestart={restart}
              onExit={handleFinishExit}
              onNextCategory={nextTopic ? () => onGoTopic(nextTopic.id) : undefined}
              nextCategoryTitle={nextTopic?.title}
            />
          ) : block && card?.kind === 'gist' ? (
            <GistCardView card={card} block={block} problemIndex={pIdx} problemCount={blocks.length} onContinue={advance} />
          ) : block && card?.kind === 'animate' ? (
            <AnimateCardView block={block} problemIndex={pIdx} problemCount={blocks.length} onContinue={advance} onOpenStudio={openStudio} />
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
            <ReassembleCardView card={card} block={block} onComplete={advance} onSkip={advance} onOpenStudio={openStudio} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
