import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Lightbulb, RotateCcw, X } from 'lucide-react';
import type { QuizQuestion } from '../../core/types';
import type { QuizProgress } from '../../lib/codeStudioPhase';
import { QuizChoiceLabel } from '../../components/QuizChoiceLabel';
import { cn } from '../../lib/cn';
import { QUIZ_WRONG_MS } from '../../lib/quizConstants';
import { newQuizRunSeed, quizQuestionSeed, shuffleQuizQuestion } from '../../lib/shuffleQuizQuestion';
import { recordAttempt } from '../../lib/progress';
import { useIsMobile } from '../../lib/useMediaQuery';
import { chromeText } from '../chromeUi';

export interface CodeStudioQuizProps {
  quiz: QuizQuestion[];
  itemId: string;
  initial?: QuizProgress | null;
  /** Label of the phase the quiz hands off to, e.g. "Structure" or "Recall". */
  nextLabel: string;
  onProgress: (p: QuizProgress) => void;
  /** Fired once when the learner leaves the quiz for the next phase. */
  onContinue: (score: number) => void;
}

function scoreMessage(score: number, total: number): string {
  const pct = total ? score / total : 0;
  if (pct === 1) return 'Flawless — you have the shape of this one cold.';
  if (pct >= 0.75) return 'Strong grasp. Lock it in by building the code next.';
  if (pct >= 0.5) return 'Decent intuition — the build phase will sharpen the gaps.';
  return 'Worth a rewatch of the walkthrough, then build it to cement it.';
}

/** SVG progress ring for the results screen. */
function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total ? Math.max(0, Math.min(1, score / total)) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const tone = pct === 1 ? 'var(--good)' : pct >= 0.5 ? 'var(--accent)' : 'var(--bad)';
  return (
    <div className="relative grid h-[84px] w-[84px] place-items-center">
      <svg viewBox="0 0 72 72" className="h-[84px] w-[84px] -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={cn('font-mono font-semibold tabular-nums text-ink', chromeText.title)}>{score}</span>
        <span className={cn('font-mono text-ink3', chromeText.sm)}>/ {total}</span>
      </div>
    </div>
  );
}

export function CodeStudioQuiz({ quiz, itemId, initial, nextLabel, onProgress, onContinue }: CodeStudioQuizProps) {
  const isMobile = useIsMobile();
  const total = quiz.length;
  const [i, setI] = useState(() => Math.min(initial?.index ?? 0, Math.max(total - 1, 0)));
  const [score, setScore] = useState(() => initial?.score ?? 0);
  const [done, setDone] = useState(() => initial?.done ?? false);
  const [picked, setPicked] = useState<number | null>(() => initial?.answered ?? null);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState(() => newQuizRunSeed());
  const rootRef = useRef<HTMLDivElement>(null);

  const rawQ = quiz[i];
  const q = useMemo(
    () => (rawQ ? shuffleQuizQuestion(rawQ, quizQuestionSeed(shuffleSeed, i)) : rawQ),
    [rawQ, shuffleSeed, i],
  );
  const answered = picked !== null;
  const isCorrect = answered && !!q?.choices[picked]?.correct;
  const last = i === total - 1;

  const persist = useCallback(
    (next: Partial<QuizProgress>) => {
      onProgress({ index: i, score, done, answered: picked, ...next });
    },
    [i, score, done, picked, onProgress],
  );

  const pick = useCallback(
    (idx: number) => {
      if (answered || done || !q) return;
      const isC = !!q.choices[idx]?.correct;
      setPicked(idx);
      setMarks((m) => {
        const copy = m.slice();
        copy[i] = isC;
        return copy;
      });
      recordAttempt(itemId, isC);
      if (isC) {
        const ns = score + 1;
        setScore(ns);
        persist({ score: ns, answered: idx });
      } else {
        persist({ answered: idx });
      }
    },
    [answered, done, q, i, score, persist, itemId],
  );

  const advance = useCallback(() => {
    if (last) {
      setDone(true);
      persist({ done: true });
      return;
    }
    const ni = i + 1;
    setI(ni);
    setPicked(null);
    persist({ index: ni, answered: null });
  }, [last, i, persist]);

  const restart = useCallback(() => {
    setI(0);
    setScore(0);
    setDone(false);
    setPicked(null);
    setMarks([]);
    setShuffleSeed(newQuizRunSeed());
    onProgress({ index: 0, score: 0, done: false, answered: null });
  }, [onProgress]);

  const afterAnswer = useCallback(() => {
    if (isCorrect) advance();
    else restart();
  }, [isCorrect, advance, restart]);

  // Wrong answer: flash feedback, then restart the full run (same as mobile).
  useEffect(() => {
    if (!answered || isCorrect || done) return;
    const t = window.setTimeout(restart, QUIZ_WRONG_MS);
    return () => window.clearTimeout(t);
  }, [answered, isCorrect, done, restart]);

  // Keep the panel focused so its keyboard shortcuts work without a click, and
  // recover focus after a choice button disables itself (which blurs to <body>).
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, [i, done, answered]);

  // A–D / 1–N to answer, Enter/→ to advance; on the results screen Enter/→
  // continues and R retries.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (done) {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          onContinue(score);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (!q) return;
      if (!answered) {
        const k = e.key.toLowerCase();
        const letter = k.charCodeAt(0) - 97; // a→0
        if (k.length === 1 && /[a-z]/.test(k) && letter < q.choices.length) {
          e.preventDefault();
          pick(letter);
          return;
        }
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= q.choices.length) {
          e.preventDefault();
          pick(num - 1);
        }
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        afterAnswer();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [answered, done, q, pick, afterAnswer, onContinue, score, restart]);

  if (total === 0 || !q) return null;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="code-studio-quiz flex min-h-0 flex-1 flex-col py-1 outline-none"
      aria-label="Concept check quiz"
    >
      <div key={done ? 'results' : `q-${i}`} className="code-studio-quiz-step flex min-h-0 flex-1 flex-col">
        {done ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-3 py-6 text-center">
            <ScoreRing score={score} total={total} />
            <p className={cn('max-w-[280px] leading-snug text-ink2', chromeText.sm)}>{scoreMessage(score, total)}</p>
            <div className="flex shrink-0 flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={restart}
                title="Retry quiz"
                className={cn('nodrag inline-flex items-center gap-1 rounded-md border border-edge px-2.5 py-1.5 text-ink2 transition-colors hover:border-accent hover:text-ink', chromeText.tight)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> {isMobile ? 'Retry' : 'Retry quiz'}
              </button>
              <button
                type="button"
                onClick={() => onContinue(score)}
                title={`Continue to ${nextLabel}`}
                className={cn('nodrag inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 font-medium text-white transition-opacity hover:opacity-90', chromeText.tight)}
              >
                {isMobile ? 'Continue' : `Continue to ${nextLabel}`}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 gap-0.5">
                {quiz.map((_, idx) => {
                  const past = idx < i || (idx === i && answered);
                  const cls = past
                    ? marks[idx] === false
                      ? 'bg-bad'
                      : 'bg-good'
                    : idx === i
                      ? 'bg-accent'
                      : 'bg-edge';
                  return <span key={idx} className={cn('h-1 flex-1 rounded-full transition-colors', cls)} />;
                })}
              </div>
              <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.sm)}>
                {i + 1}/{total}
              </span>
              <span className={cn('shrink-0 rounded bg-panel2 px-1.5 py-px font-mono tabular-nums text-ink2', chromeText.sm)}>
                {score}✓
              </span>
            </div>

            <p className={cn('font-medium leading-snug text-ink', chromeText.base)}>{q.prompt}</p>

            <div className="flex flex-col gap-1">
              {q.choices.map((c, idx) => {
                const letter = String.fromCharCode(65 + idx);
                let state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle';
                if (answered) {
                  if (c.correct) state = 'correct';
                  else if (idx === picked) state = 'wrong';
                  else state = 'dim';
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => pick(idx)}
                    disabled={answered}
                    className={cn(
                      'quiz-choice nodrag flex items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-all',
                      state === 'idle' && 'border-edge bg-panel2/40 text-ink hover:border-accent/60 hover:bg-panel2',
                      state === 'correct' && 'quiz-choice-correct border-good bg-goodbg text-good',
                      state === 'wrong' && 'border-bad bg-badbg text-bad',
                      state === 'dim' && 'border-edge text-ink3 opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded font-mono font-semibold',
                        chromeText.sm,
                        state === 'correct'
                          ? 'bg-good text-white'
                          : state === 'wrong'
                            ? 'bg-bad text-white'
                            : 'bg-panel text-ink3',
                      )}
                    >
                      {state === 'correct' ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : state === 'wrong' ? (
                        <X className="h-2.5 w-2.5" />
                      ) : (
                        letter
                      )}
                    </span>
                    <span className={cn('min-w-0 flex-1 leading-snug', chromeText.tight)}>
                      <QuizChoiceLabel label={c.label} size="studio" state={state} />
                    </span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className={cn(
                  'quiz-explain flex flex-col gap-1.5 rounded-lg border-l-2 bg-panel2/50 px-2.5 py-1.5',
                  isCorrect ? 'border-good' : 'border-accent',
                )}
              >
                <div className={cn('flex items-center gap-1.5 font-semibold', chromeText.sm)}>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-good">
                      <Check className="h-3 w-3" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-bad">
                      <X className="h-3 w-3" /> Start over — get them all right
                    </span>
                  )}
                </div>
                <p className={cn('flex items-start gap-1.5 leading-snug text-ink2', chromeText.sm)}>
                  <Lightbulb className="mt-px h-3 w-3 shrink-0 text-ink3" />
                  <span className="min-w-0 flex-1">{q.explain}</span>
                </p>
                <button
                  type="button"
                  onClick={afterAnswer}
                  className={cn('nodrag mt-0.5 inline-flex w-fit items-center gap-0.5 self-end rounded-md bg-accent px-2.5 py-1 font-medium text-white transition-opacity hover:opacity-90', chromeText.sm)}
                >
                  {isCorrect ? (last ? 'See score' : 'Next') : 'Try again'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
