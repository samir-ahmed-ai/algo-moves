import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { Item } from '../../../content';
import { recordAttempt, logMistake } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { QuizChoiceLabel } from '../../../components/shared/QuizChoiceLabel';
import { ReassemblePane } from '../../../components/puzzle/ReassemblePane';
import { ASSEMBLE_GAMES, defaultGameFor } from '../../../components/puzzle/assemble';
import { assembleGameStatsStore } from '../../assembleGameStats';
import { quizQuestionSeed, shuffleQuizQuestion } from '@/lib/quiz';
import { QUIZ_CORRECT_MS, QUIZ_WRONG_MS } from '@/lib/quiz';
import { correctIndex, type GistCard as GistCardData, type ProblemBlock, type QuizCard as QuizCardData, type ReassembleCard as ReassembleCardData } from './deckModel';
import { GistArcCaption } from '../../../components/shared/GistArcCaption';
import { GistScene } from '../scenes/gistScenes';
import { MobileVizShell } from '../MobileVizShell';
import { tintFor } from './mobileCardTints';

/* ------------------------------------------------------------------ shared */

function DiffChip({ item }: { item: Item }) {
  if (!item.difficulty) return null;
  const tint = tintFor(item);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[length:var(--fs-tight)] font-semibold uppercase tracking-wide"
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

/* -------------------------------------------------------------------- gist */

const GIST_SECONDS = 10;

/** Depleting ring that doubles as a pause toggle for the auto-advance. */
function TimerRing({
  remaining,
  total,
  paused,
  onToggle,
}: {
  remaining: number;
  total: number;
  paused: boolean;
  onToggle: () => void;
}) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / total));
  return (
    <button
      type="button"
      onClick={onToggle}
      data-noswipe
      aria-label={paused ? 'Resume auto-advance' : `Pause — starts in ${Math.ceil(remaining)}s`}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink2 transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 90ms linear' }}
        />
      </svg>
      {paused ? (
        <Play className="h-3.5 w-3.5" />
      ) : (
        <span className="text-[length:var(--fs-xs)] font-semibold tabular-nums text-ink">{Math.ceil(remaining)}</span>
      )}
    </button>
  );
}

/**
 * Problem intro: a big creative scene + one concise "ask", then it jumps to the
 * action after a 10s countdown (or the moment the student taps Start / Skip).
 */
export function GistCardView({
  card,
  block,
  problemIndex,
  problemCount,
  onContinue,
}: {
  card: GistCardData;
  block: ProblemBlock;
  problemIndex: number;
  problemCount: number;
  onContinue: () => void;
}) {
  const { item } = block;
  const tint = tintFor(item);
  const [remaining, setRemaining] = useState(GIST_SECONDS);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  // One rAF loop per problem; pause freezes it without resetting the clock.
  useEffect(() => {
    pausedRef.current = false;
    setPaused(false);
    setRemaining(GIST_SECONDS);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let done = false;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && document.visibilityState === 'visible') {
        acc += dt;
        const left = Math.max(0, GIST_SECONDS - acc / 1000);
        setRemaining(left);
        if (left <= 0 && !done) {
          done = true;
          onContinueRef.current();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [card.key]);

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  };

  const summary = block.plugin.meta.summary;

  return (
    <div className="mobile-card-shell mobile-gist-card flex flex-1 flex-col px-5 pt-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {block.pattern && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accentbg px-2 py-0.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3 w-3" />
              {block.pattern}
            </span>
          )}
          <DiffChip item={item} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[length:var(--fs-tight)] font-semibold tabular-nums text-ink3">
            {problemIndex + 1}/{problemCount}
          </span>
          <TimerRing remaining={remaining} total={GIST_SECONDS} paused={paused} onToggle={togglePause} />
        </div>
      </div>

      <div className="mobile-gist-visual mt-2 flex min-h-0 flex-1 flex-col">
        <div
          className="mobile-gist-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-edge/60 bg-panel2/40 text-ink2"
          data-noswipe
        >
          <GistScene key={item.id} item={item} className="h-full w-full" />
          <GistArcCaption primary={card.gist} secondary={item.title} />
        </div>
      </div>

      {summary && (
        <div className="mobile-problem-context mt-3 shrink-0 rounded-2xl border border-edge bg-panel/80 px-3.5 py-2.5">
          <p className="text-[length:var(--fs-sm)] leading-relaxed text-ink2 line-clamp-3">{summary}</p>
        </div>
      )}

      <div className="mt-3 flex shrink-0 flex-col gap-2 pb-1">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 self-stretch rounded-full px-5 py-3 text-[length:var(--fs-title)] font-semibold text-white shadow-[var(--shadow-lg)]"
          style={{ background: tint }}
        >
          Watch the algorithm
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-1 self-center rounded-full px-4 py-1.5 text-[length:var(--fs-xs)] font-medium text-ink3 hover:bg-panel2 hover:text-ink"
        >
          Skip
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
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
  const [watched, setWatched] = useState(false);
  const summary = plugin.meta.summary;

  return (
    <div className="mobile-card-shell mobile-animate-card flex flex-1 flex-col px-4 pt-3">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[length:var(--fs-tight)] font-semibold tabular-nums text-ink3">{problemIndex + 1}/{problemCount}</span>
          {block.pattern && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accentbg px-2 py-0.5 text-[length:var(--fs-2xs)] font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              {block.pattern}
            </span>
          )}
          <DiffChip item={item} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-ink">{item.title}</h2>
        </div>
        {summary && (
          <p className="mt-0.5 text-[length:var(--fs-xs)] leading-snug text-ink3 line-clamp-2">{summary}</p>
        )}
      </div>

      <MobileVizShell key={item.id} plugin={plugin} onWatched={() => setWatched(true)} />

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch rounded-full px-5 py-3 text-[length:var(--fs-title)] font-semibold text-white shadow-[var(--shadow-lg)]"
          style={{ background: watched ? 'var(--good)' : tint }}
        >
          {watched ? (
            <>
              <Check className="h-4 w-4" />
              Got it — quiz time
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="mb-1 inline-flex items-center justify-center gap-1.5 self-center rounded-full px-4 py-2 text-[length:var(--fs-sm)] font-medium text-ink3 hover:bg-panel2 hover:text-ink"
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
  onNavLockChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onGoToQuestion,
}: {
  card: QuizCardData;
  block: ProblemBlock;
  quizRunSeed: number;
  quizAttempt: number;
  onAnswered: (correct: boolean) => void;
  onAdvance: () => void;
  onRestartQuiz: () => void;
  onNavLockChange?: (locked: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onGoToQuestion: (qIndex: number) => void;
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
  const attempt = Math.max(1, quizAttempt + 1);
  const timer = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const pickedRef = useRef(false); // synchronous lock — blocks rapid double-taps before re-render

  // Reset when the question changes (deck reuses this component across cards).
  useEffect(() => {
    aliveRef.current = true;
    pickedRef.current = false;
    setPicked(null);
    onNavLockChange?.(false);
    return () => {
      aliveRef.current = false;
      onNavLockChange?.(false);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [card.key, quizRunSeed, quizAttempt, onNavLockChange]);

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
    if (!correct) onNavLockChange?.(true);
    timer.current = window.setTimeout(() => {
      if (!aliveRef.current) return;
      onNavLockChange?.(false);
      if (correct) onAdvance();
      else onRestartQuiz();
    }, correct ? QUIZ_CORRECT_MS : QUIZ_WRONG_MS);
  };

  const skipWait = () => {
    if (!answered) return;
    if (timer.current) window.clearTimeout(timer.current);
    onNavLockChange?.(false);
    if (isCorrect) onAdvance();
    else onRestartQuiz();
  };

  const leaveQuestion = () => {
    if (timer.current) window.clearTimeout(timer.current);
    onNavLockChange?.(false);
    onNext();
  };

  const goBack = () => {
    if (timer.current) window.clearTimeout(timer.current);
    onNavLockChange?.(false);
    onPrev();
  };

  const summary = block.plugin.meta.summary;

  return (
    <div className="mobile-card-shell ws-scroll relative flex flex-1 flex-col overflow-y-auto px-5 pt-4">
      {answered && isCorrect && <Confetti />}

      {/* Header: title + summary + progress dots */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[length:var(--fs-tight)] font-semibold uppercase tracking-[0.16em] text-ink3">{item.title}</span>
          {summary && (
            <p className="mt-0.5 text-[length:var(--fs-tight)] leading-snug text-ink3 line-clamp-2">{summary}</p>
          )}
        </div>
        <span
          className="ml-2 mt-0.5 inline-flex shrink-0 flex-wrap items-center justify-end gap-1.5"
          aria-label={`Question ${card.qIndex} of ${card.qCount}`}
        >
          {quizAttempt > 0 && (
            <span className="inline-flex items-center rounded-full bg-panel2 px-2 py-0.5 text-[length:var(--fs-2xs)] font-medium text-ink3">
              Attempt {attempt}
            </span>
          )}
          {Array.from({ length: card.qCount }, (_, i) => {
            const active = i === card.qIndex - 1;
            return (
              <button
                key={i}
                type="button"
                data-noswipe
                onClick={() => onGoToQuestion(i + 1)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={active ? 'step' : undefined}
                className="rounded-full transition-all"
                style={{
                  width: active ? 16 : 6,
                  height: 6,
                  background: i < card.qIndex - 1 ? 'var(--good)' : active ? 'var(--accent)' : 'var(--border-strong)',
                }}
              />
            );
          })}
        </span>
      </div>

      {/* Coaching nudge on retry */}
      {quizAttempt > 0 && !answered && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-accentbg bg-accentbg/60 px-3 py-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-[length:var(--fs-xs)] leading-snug text-accent">
            Re-read the explanation — the key insight is there.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accentbg text-accent">
          <Brain className="h-4 w-4" />
        </span>
        <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-ink">{question.prompt}</h2>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
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
                showCorrect && 'mobile-choice-correct border-good bg-goodbg',
                showWrong && 'mobile-choice-wrong border-bad bg-badbg',
                answered && !showCorrect && !showWrong && 'mobile-choice-dim border-edge/70',
              )}
            >
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[length:var(--fs-sm)] font-bold',
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
        <div
          key={`explain-${picked}`}
          className={cn(
            'mobile-explain mt-4 rounded-2xl border px-3.5 py-3',
            isCorrect ? 'mobile-choice-correct border-good bg-goodbg/50' : 'mobile-choice-wrong border-bad bg-badbg/45',
          )}
          role="status"
          aria-live="polite"
        >
          <div className={cn('flex items-center gap-1.5 text-[length:var(--fs-tight)] font-semibold uppercase tracking-wide', isCorrect ? 'text-good' : 'text-bad')}>
            {isCorrect ? <Check className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
            {isCorrect ? 'Correct' : 'Start over — here’s why'}
          </div>
          <p className="mt-1 text-[length:var(--fs)] leading-relaxed text-ink2">{question.explain}</p>
        </div>
      )}

      <div className="mt-auto" />

      <div className="sticky bottom-0 -mx-5 flex shrink-0 items-center gap-2 border-t border-edge/60 bg-panel/95 px-5 py-3 backdrop-blur-sm" data-noswipe>
        <button
          type="button"
          onClick={goBack}
          disabled={!canPrev}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-edge bg-panel px-4 py-2.5 text-[length:var(--fs-sm)] font-medium text-ink2 transition-colors hover:text-ink disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={answered && !isCorrect ? skipWait : leaveQuestion}
          disabled={!canNext && !(answered && !isCorrect)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-accent px-4 py-2.5 text-[length:var(--fs-sm)] font-semibold text-white disabled:opacity-35"
        >
          {answered && !isCorrect ? 'Retry' : answered ? 'Next' : 'Skip'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- reassemble */

/** Classic tray rebuild plus the creative assemble trio; each problem opens on
 *  a stable per-problem default game (via `defaultGameFor`) so a topic run
 *  rotates through all three. All modes are one swipe away in the header roll. */
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
  const lang = block.code?.lang ?? 'go';
  const gameScope = `${item.id}:${lang}`;
  const [gameId, setGameId] = useState<string>(() => defaultGameFor(gameScope).id);
  const [showHint, setShowHint] = useState(false);
  const modeRollRef = useRef<HTMLDivElement>(null);
  const game = ASSEMBLE_GAMES.find((g) => g.id === gameId);
  const gameStats = useMemo(() => assembleGameStatsStore(gameScope), [gameScope]);
  const hintPiece = card.pieces[0];

  useEffect(() => {
    const active = modeRollRef.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [gameId]);

  const modePillClass = (on: boolean) =>
    cn(
      'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[length:var(--fs-2xs)] font-semibold transition-colors',
      on ? 'bg-accentbg text-accent' : 'bg-panel2 text-ink3 hover:text-ink',
    );

  return (
    <div className="mobile-card-shell mobile-reassemble-card flex min-h-0 flex-1 flex-col px-2 pt-3">
      {/* Context header — label row carries the mode roll */}
      <div className="px-1">
        <div className="flex items-center gap-1.5">
          {block.pattern && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accentbg px-2 py-0.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-2.5 w-2.5" />
              {block.pattern}
            </span>
          )}
          <div
            ref={modeRollRef}
            className="ws-scroll flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
            data-noswipe
            role="tablist"
            aria-label="Assemble game"
          >
            <button
              type="button"
              role="tab"
              aria-selected={gameId === 'classic'}
              onClick={() => setGameId('classic')}
              className={modePillClass(gameId === 'classic')}
            >
              Classic
            </button>
            {ASSEMBLE_GAMES.map((g) => {
              const Icon = g.icon;
              const on = g.id === gameId;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setGameId(g.id)}
                  className={modePillClass(on)}
                >
                  <Icon className="h-3 w-3" />
                  {g.name}
                </button>
              );
            })}
            {onOpenStudio && (
              <button
                type="button"
                onClick={onOpenStudio}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-panel2 px-2 text-[length:var(--fs-2xs)] font-medium text-ink3 hover:text-ink"
              >
                <LayoutGrid className="h-3 w-3" />
                Studio
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              data-noswipe
              onClick={() => setShowHint((h) => !h)}
              title={showHint ? 'Hide hint' : 'Show first line'}
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full transition-colors',
                showHint ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
              )}
            >
              {showHint ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full px-2 py-1 text-[length:var(--fs-tight)] font-medium text-ink3 hover:bg-panel2 hover:text-ink"
            >
              Skip
            </button>
          </div>
        </div>
        <div className="mt-0.5 truncate text-[length:var(--fs-title)] font-semibold text-ink">{item.title}</div>
      </div>

      {/* Hint strip — shows the first code piece as a visual cue */}
      {showHint && hintPiece && (
        <div className="mt-2 shrink-0 rounded-xl border border-accentbg bg-accentbg/30 px-3 py-2" data-noswipe>
          <p className="mb-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-accent">Hint — first block:</p>
          <code className="block whitespace-pre-wrap font-mono text-[length:var(--fs-tight)] leading-relaxed text-ink2 opacity-80">
            {hintPiece.code.trim()}
          </code>
        </div>
      )}

      {game ? (
        /* Games own horizontal gestures (flick, trace), so shield the whole
         * interaction area from the deck's swipe. */
        <div className="mt-2 flex min-h-0 flex-1 flex-col px-1" data-noswipe>
          <game.Component
            key={`${card.key}:${game.id}`}
            pieces={card.pieces}
            lang={lang}
            storageKey={gameScope}
            stats={gameStats}
            onContinue={onComplete}
          />
        </div>
      ) : (
        /* The pane owns its own drag/drop, so shield it from the deck's swipe gesture. */
        <div className="practice mobile-reassemble mt-2 flex min-h-0 flex-1 flex-col" data-noswipe>
          <ReassemblePane
            key={card.key}
            pieces={card.pieces}
            lang={lang}
            variant="mobile"
            resetOnWrong
            onComplete={onComplete}
          />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- complete */

export function CompleteScreen({
  topicTitle,
  totalQuiz,
  problemCount,
  onRestart,
  onExit,
  onNextCategory,
  nextCategoryTitle,
}: {
  topicTitle: string;
  totalQuiz?: number;
  problemCount?: number;
  onRestart: () => void;
  onExit: () => void;
  onNextCategory?: () => void;
  nextCategoryTitle?: string;
}) {
  return (
    <div className="mobile-card-shell relative flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Confetti />
      <div className="relative grid h-20 w-20 place-items-center rounded-full bg-accentbg text-accent">
        <Trophy className="h-9 w-9" />
      </div>
      <h2 className="relative mt-6 text-[22px] font-bold tracking-tight text-ink">Well done!</h2>
      <p className="relative mt-1.5 text-[length:var(--fs)] text-ink2">
        You completed <span className="font-semibold text-ink">{topicTitle}</span>
      </p>

      {(problemCount != null || totalQuiz != null) && (
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-edge bg-panel px-5 py-3">
          {problemCount != null && (
            <div className="flex flex-col items-center">
              <span className="text-[22px] font-bold tabular-nums text-ink">{problemCount}</span>
              <span className="text-[length:var(--fs-tight)] text-ink3">problems</span>
            </div>
          )}
          {problemCount != null && totalQuiz != null && (
            <div className="h-8 w-px bg-edge" />
          )}
          {totalQuiz != null && totalQuiz > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-[22px] font-bold tabular-nums text-ink">{totalQuiz}</span>
              <span className="text-[length:var(--fs-tight)] text-ink3">quiz questions</span>
            </div>
          )}
        </div>
      )}

      <div className="relative mt-8 flex w-full max-w-[280px] flex-col gap-2.5">
        {onNextCategory && (
          <button type="button" onClick={onNextCategory} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[length:var(--fs-title)] font-semibold text-white">
            Next: {nextCategoryTitle}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-panel px-5 py-2.5 text-[length:var(--fs)] font-medium text-ink2 hover:text-ink">
          <RotateCcw className="h-4 w-4" />
          Practice again
        </button>
        <button type="button" onClick={onExit} className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[length:var(--fs-sm)] font-medium text-ink3 hover:text-ink">
          Back to categories
        </button>
      </div>
    </div>
  );
}
