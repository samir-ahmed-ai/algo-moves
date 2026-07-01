import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  LayoutGrid,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { Item } from '../../content';
import { recordAttempt, logMistake } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { QuizChoiceLabel } from '../../components/QuizChoiceLabel';
import { ReassemblePane } from '../../components/ReassemblePane';
import { quizQuestionSeed, shuffleQuizQuestion } from '../../lib/shuffleQuizQuestion';
import { QUIZ_CORRECT_MS, QUIZ_WRONG_MS } from '../../lib/quizConstants';
import { correctIndex, type ProblemBlock, type QuizCard as QuizCardData, type ReassembleCard as ReassembleCardData } from './deckModel';
import { MobileVizShell } from './MobileVizShell';

/* ------------------------------------------------------------------ shared */

const DIFF_TINT: Record<string, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

export function tintFor(item: Item): string {
  return DIFF_TINT[item.difficulty ?? ''] ?? 'var(--accent)';
}

function DiffChip({ item }: { item: Item }) {
  if (!item.difficulty) return null;
  const tint = tintFor(item);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: tint, background: 'color-mix(in srgb, ' + tint + ' 16%, transparent)' }}
    >
      {item.difficulty}
    </span>
  );
}

/** Burst of confetti dots — pure CSS, fires once on mount. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${8 + (i * 84) / 14 + (i % 3) * 3}%`,
        delay: `${(i % 5) * 40}ms`,
        hue: ['var(--good)', 'var(--accent)', 'var(--edge-active)'][i % 3],
        dur: `${700 + (i % 4) * 160}ms`,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="mobile-confetti"
          style={{ left: b.left, background: b.hue, animationDelay: b.delay, animationDuration: b.dur }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- animate */

export function AnimateCardView({
  block,
  problemIndex,
  problemCount,
  onContinue,
  onOpenStudio,
}: {
  block: ProblemBlock;
  problemIndex: number;
  problemCount: number;
  onContinue: () => void;
  onOpenStudio?: () => void;
}) {
  const { item, plugin } = block;
  const tint = tintFor(item);
  return (
    <div className="mobile-card-shell mobile-animate-card flex flex-1 flex-col px-4 pt-3">
      <div className="shrink-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink3">
          Problem {problemIndex + 1} of {problemCount}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-ink">{item.title}</h2>
          <DiffChip item={item} />
        </div>
        {block.pattern && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accentbg px-2 py-0.5 text-[10px] font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            {block.pattern}
          </span>
        )}
      </div>

      <MobileVizShell key={item.id} plugin={plugin} />

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch rounded-full px-5 py-3 text-[15px] font-semibold text-white shadow-[var(--shadow-lg)]"
          style={{ background: tint }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="mb-1 inline-flex items-center justify-center gap-1.5 self-center rounded-full px-4 py-2 text-[13px] font-medium text-ink3 hover:bg-panel2 hover:text-ink"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Open in studio
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- quiz */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizCardView({
  card,
  block,
  quizRunSeed,
  quizAttempt,
  onAnswered,
  onAdvance,
  onRestartQuiz,
}: {
  card: QuizCardData;
  block: ProblemBlock;
  quizRunSeed: number;
  quizAttempt: number;
  onAnswered: (correct: boolean) => void;
  onAdvance: () => void;
  onRestartQuiz: () => void;
}) {
  const { item } = block;
  const { question } = card;
  const q = useMemo(
    () => shuffleQuizQuestion(question, quizQuestionSeed(quizRunSeed, card.qIndex, quizAttempt)),
    [question, card.qIndex, quizRunSeed, quizAttempt],
  );
  const answer = correctIndex(q);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const isCorrect = picked === answer;
  const timer = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const pickedRef = useRef(false); // synchronous lock — blocks rapid double-taps before re-render

  // Reset when the question changes (deck reuses this component across cards).
  useEffect(() => {
    aliveRef.current = true;
    pickedRef.current = false;
    setPicked(null);
    return () => {
      aliveRef.current = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [card.key, quizRunSeed, quizAttempt]);

  const choose = (idx: number) => {
    if (pickedRef.current || answered) return;
    pickedRef.current = true;
    const correct = idx === answer;
    setPicked(idx);
    recordAttempt(item.id, correct);
    if (!correct) {
      logMistake({
        problemId: item.id,
        problemTitle: item.title,
        prompt: question.prompt,
        picked: q.choices[idx]?.label ?? '',
        answer: q.choices[answer]?.label ?? '',
      });
    }
    onAnswered(correct);
    timer.current = window.setTimeout(() => {
      if (!aliveRef.current) return;
      if (correct) onAdvance();
      else onRestartQuiz();
    }, correct ? QUIZ_CORRECT_MS : QUIZ_WRONG_MS);
  };

  const skipWait = () => {
    if (!answered) return;
    if (timer.current) window.clearTimeout(timer.current);
    if (isCorrect) onAdvance();
    else onRestartQuiz();
  };

  return (
    <div className="mobile-card-shell ws-scroll relative flex flex-1 flex-col overflow-y-auto px-5 pt-4">
      {answered && isCorrect && <Confetti />}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink3">{item.title}</span>
        <span className="ml-auto inline-flex items-center gap-1.5" aria-label={`Question ${card.qIndex} of ${card.qCount}`}>
          {Array.from({ length: card.qCount }, (_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === card.qIndex - 1 ? 16 : 6,
                background: i < card.qIndex - 1 ? 'var(--good)' : i === card.qIndex - 1 ? 'var(--accent)' : 'var(--border-strong)',
              }}
            />
          ))}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accentbg text-accent">
          <Brain className="h-4 w-4" />
        </span>
        <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-ink">{question.prompt}</h2>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {q.choices.map((c, i) => {
          const showCorrect = answered && i === answer;
          const showWrong = answered && i === picked && i !== answer;
          const choiceState = showCorrect ? 'correct' : showWrong ? 'wrong' : answered ? 'dim' : 'idle';
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              className={cn(
                'mobile-choice flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
                !answered && 'border-edge bg-panel active:scale-[0.99]',
                showCorrect && 'border-good bg-goodbg',
                showWrong && 'border-bad bg-badbg',
                answered && !showCorrect && !showWrong && 'border-edge opacity-45',
              )}
            >
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] font-bold',
                  showCorrect && 'bg-good text-white',
                  showWrong && 'bg-bad text-white',
                  !showCorrect && !showWrong && 'bg-panel2 text-ink2',
                )}
              >
                {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1">
                <QuizChoiceLabel label={c.label} size="mobile" state={choiceState} />
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mobile-explain mt-4 rounded-2xl border border-edge bg-panel2/60 px-3.5 py-3" role="status" aria-live="polite">
          <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', isCorrect ? 'text-good' : 'text-bad')}>
            {isCorrect ? <Check className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
            {isCorrect ? 'Correct' : 'Start over — here’s why'}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">{question.explain}</p>
        </div>
      )}

      <div className="mt-auto" />
      {answered && (
        <button
          type="button"
          onClick={skipWait}
          className="mb-5 mt-3 inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          {isCorrect ? 'Next' : 'Try again'}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- reassemble */

export function ReassembleCardView({
  card,
  block,
  onComplete,
  onSkip,
  onOpenStudio,
}: {
  card: ReassembleCardData;
  block: ProblemBlock;
  onComplete: () => void;
  onSkip: () => void;
  onOpenStudio?: () => void;
}) {
  const { item } = block;
  return (
    <div className="mobile-card-shell mobile-reassemble-card flex min-h-0 flex-1 flex-col px-2 pt-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accentbg text-accent">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink3">Rebuild it</div>
          <div className="truncate text-[15px] font-semibold text-ink">{item.title}</div>
        </div>
        {onOpenStudio && (
          <button type="button" onClick={onOpenStudio} className="ml-auto shrink-0 text-[11px] font-medium text-ink3 hover:text-ink">
            Studio
          </button>
        )}
        <button type="button" onClick={onSkip} className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink3 hover:bg-panel2 hover:text-ink">
          Skip
        </button>
      </div>
      {/* The pane owns its own drag/drop, so shield it from the deck's swipe gesture. */}
      <div className="practice mobile-reassemble mt-3 flex min-h-0 flex-1 flex-col" data-noswipe>
        <ReassemblePane
          key={card.key}
          pieces={card.pieces}
          lang={block.code?.lang ?? 'go'}
          variant="mobile"
          resetOnWrong
          onComplete={onComplete}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- complete */

export function CompleteScreen({
  topicTitle,
  onRestart,
  onExit,
  onNextCategory,
  nextCategoryTitle,
}: {
  topicTitle: string;
  onRestart: () => void;
  onExit: () => void;
  onNextCategory?: () => void;
  nextCategoryTitle?: string;
}) {
  return (
    <div className="mobile-card-shell relative flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Confetti />
      <div className="relative grid h-20 w-20 place-items-center rounded-full bg-accentbg text-accent">
        <Play className="h-9 w-9" />
      </div>
      <h2 className="relative mt-6 text-xl font-semibold tracking-tight text-ink">Topic complete</h2>
      <p className="relative mt-1.5 text-[14px] text-ink2">
        Finished <span className="font-semibold text-ink">{topicTitle}</span>
      </p>

      <div className="relative mt-8 flex w-full max-w-[280px] flex-col gap-2.5">
        {onNextCategory && (
          <button type="button" onClick={onNextCategory} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-white">
            Next: {nextCategoryTitle}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-panel px-5 py-2.5 text-[14px] font-medium text-ink2 hover:text-ink">
          <RotateCcw className="h-4 w-4" />
          Run it again
        </button>
        <button type="button" onClick={onExit} className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[13px] font-medium text-ink3 hover:text-ink">
          Back to categories
        </button>
      </div>
    </div>
  );
}
