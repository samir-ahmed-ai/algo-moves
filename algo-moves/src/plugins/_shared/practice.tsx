/**
 * Shared, plugin-agnostic teaching panels. Every plugin already ships a `record`
 * (input → Frame[]) and a `View` (Frame → board); these factories turn that pair
 * into the three teaching surfaces is-bipartite pioneered, with zero per-plugin
 * UI code:
 *
 *   - makeCasesPanel   — worked good/bad examples, each rendered with the plugin's
 *                        own View at a chosen frame, plus a Q/A teaching note.
 *   - makeQuizPanel    — multiple-choice conceptual quiz (data-only).
 *   - makeSimulatePanel — step the recorded run, the student predicts each next move.
 *
 * Import these (not the barrel) from a plugin's index.tsx, feed them data, and
 * register the returned components as `tabs`. Cycle-safe: depends only on
 * core/types + lib + the canvas actions context, never on the plugin registry.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { QuizChoiceLabel } from '../../components/QuizChoiceLabel';
import { QUIZ_CORRECT_MS, QUIZ_WRONG_MS, QUIZ_SHUFFLE_BY_DEFAULT } from '../../lib/quizConstants';
import { newQuizRunSeed, quizQuestionSeed, shuffleQuizQuestion } from '../../lib/shuffleQuizQuestion';
import { vizText } from './vizTokens';
import { useCanvasActions } from '../../lib/canvasActions';
import { recordAttempt } from '../../lib/progress';
import { useCanvasStatic } from '../../shell/canvas/CanvasContext';
import { VizFitBox, MiniTabs } from '../../lib/canvasTeachingUi';
import type { Frame, PluginViewProps, QuizQuestion, SampleInput } from '../../core/types';

/* ------------------------------------------------------------------ Quiz -- */

export type { QuizChoice, QuizQuestion } from '../../core/types';

const CORRECT_ADVANCE_MS = QUIZ_CORRECT_MS;
const FINISH_FOCUS_MS = 700;

export interface QuizConfig {
  /** Panel id used to focus self / advance the practice chain. Default 'quiz'. */
  id?: string;
  /** Shuffle choice order on display. Default follows `QUIZ_SHUFFLE_BY_DEFAULT`. */
  shuffle?: boolean;
}

/** Build a self-contained multiple-choice quiz panel from question data. */
export function makeQuizPanel(quiz: QuizQuestion[], config: QuizConfig = {}) {
  const panelId = config.id ?? 'quiz';
  const shuffleChoices = config.shuffle ?? QUIZ_SHUFFLE_BY_DEFAULT;

  return function QuizPanel() {
    const { focusPanel, advancePractice } = useCanvasActions();
    const { item } = useCanvasStatic();
    const [i, setI] = useState(0);
    const [picked, setPicked] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [shuffleSeed, setShuffleSeed] = useState(() => newQuizRunSeed());

    const rawQ = quiz[i];
    const q = useMemo(
      () => (rawQ ? shuffleQuizQuestion(rawQ, quizQuestionSeed(shuffleSeed, i), shuffleChoices) : rawQ),
      [rawQ, shuffleSeed, i, shuffleChoices],
    );
    const answered = picked !== null;
    const correct = answered && picked !== null && !!q?.choices[picked]?.correct;
    const last = i === quiz.length - 1;

    const restartRun = () => {
      setI(0);
      setPicked(null);
      setScore(0);
      setDone(false);
      setShuffleSeed(newQuizRunSeed());
    };

    const pick = (idx: number) => {
      if (answered || !q) return;
      focusPanel(panelId);
      setPicked(idx);
      const isC = !!q.choices[idx]?.correct;
      recordAttempt(item.id, isC);
      if (isC) setScore((s) => s + 1);
    };

    const next = () => {
      if (last) {
        setDone(true);
        return;
      }
      setI((n) => n + 1);
      setPicked(null);
    };

    const afterAnswer = () => {
      if (correct) next();
      else restartRun();
    };

    useEffect(() => {
      if (picked === null || !q?.choices[picked]?.correct) return;
      const t = window.setTimeout(() => {
        if (i === quiz.length - 1) setDone(true);
        else {
          setI((n) => n + 1);
          setPicked(null);
        }
      }, CORRECT_ADVANCE_MS);
      return () => window.clearTimeout(t);
    }, [picked, i, q?.choices]);

    useEffect(() => {
      if (picked === null || correct) return;
      const t = window.setTimeout(restartRun, QUIZ_WRONG_MS);
      return () => window.clearTimeout(t);
    }, [picked, correct]);

    useEffect(() => {
      if (!done) return;
      const t = window.setTimeout(() => advancePractice(panelId), FINISH_FOCUS_MS);
      return () => window.clearTimeout(t);
    }, [done, advancePractice]);

    const restart = () => {
      restartRun();
    };

    if (done || !q) {
      const perfect = score === quiz.length;
      return (
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className={cn('font-semibold leading-none tabular-nums text-ink', vizText.expr, vizText.mono)}>
            {score}
            <span className={cn(vizText.base, 'text-ink3')}>/{quiz.length}</span>
          </div>
          <p className={cn('max-w-[240px] text-center leading-snug text-ink2', vizText.xs)}>
            {perfect ? 'Perfect — you know the shape of this one.' : 'Run it again to lock it in.'}
          </p>
          <button
            type="button"
            onClick={restart}
            className={cn('mt-0.5 inline-flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 transition-colors hover:border-accent hover:text-ink', vizText.xs)}
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-0.5">
            {quiz.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  idx < i ? 'bg-good' : idx === i ? 'bg-accent' : 'bg-edge',
                )}
              />
            ))}
          </div>
          <span className={cn('shrink-0 tabular-nums text-ink3', vizText.xs, vizText.mono)}>
            {i + 1}/{quiz.length}
          </span>
          <span className={cn('shrink-0 rounded bg-panel2 px-1 py-px tabular-nums text-ink2', vizText.xs, vizText.mono)}>
            {score}✓
          </span>
        </div>

        <p className={cn('font-medium leading-snug text-ink', vizText.sm)}>{q.prompt}</p>

        <div className="flex flex-col gap-0.5">
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
                  'flex items-start gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors',
                  state === 'idle' && 'border-edge bg-panel2/40 text-ink hover:border-accent/60 hover:bg-panel2',
                  state === 'correct' && 'border-good bg-goodbg text-good',
                  state === 'wrong' && 'border-bad bg-badbg text-bad',
                  state === 'dim' && 'border-edge text-ink3 opacity-50',
                )}
              >
                <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded bg-panel font-mono font-semibold text-ink3', vizText['2xs'])}>
                  {answered && c.correct ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : answered && idx === picked ? (
                    <X className="h-2.5 w-2.5" />
                  ) : (
                    letter
                  )}
                </span>
                <span className={cn('min-w-0 flex-1 leading-snug', vizText.sm)}>
                  <QuizChoiceLabel label={c.label} size="studio" state={state} />
                </span>
              </button>
            );
          })}
        </div>

        {answered && !correct && (
          <div className="flex items-end gap-1.5 border-l-2 border-bad pl-2">
            <p className={cn('min-w-0 flex-1 leading-snug text-ink2', vizText.xs)}>{q.explain}</p>
            <button
              type="button"
              onClick={afterAnswer}
              className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-md bg-accent px-2 py-0.5 font-medium text-white hover:opacity-90', vizText['2xs'])}
            >
              Try again
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };
}

/* --------------------------------------------------------------- Simulate -- */

/** Pick the correct next-move note plus two plausible distractors from the run. */
function buildOptions<S>(frames: Frame<S>[], k: number) {
  const correct = frames[k + 1].move.note;
  const pool = Array.from(new Set(frames.map((f) => f.move.note))).filter((n) => n !== correct);
  const distractors: string[] = [];
  let j = 1;
  while (distractors.length < 2 && pool.length > 0 && j < pool.length + 8) {
    const cand = pool[(k * 5 + j * 3) % pool.length];
    if (cand && !distractors.includes(cand)) distractors.push(cand);
    j++;
  }
  const fillers = ['done', 'return', `step ${frames.length + k}`];
  let fi = 0;
  while (distractors.length < 2 && fi < fillers.length) {
    const f = fillers[fi++];
    if (f !== correct && !distractors.includes(f)) distractors.push(f);
  }
  const opts = [correct, ...distractors];
  const r = k % opts.length;
  return { correct, options: opts.slice(r).concat(opts.slice(0, r)) };
}

export interface SimulateConfig<I, S> {
  inputs: SampleInput<I>[];
  record: (input: I) => Frame<S>[];
  View: ComponentType<PluginViewProps<S>>;
  /** Panel id used to focus self / advance the practice chain. Default 'simulate'. */
  id?: string;
  /** Prompt shown above the move options. */
  question?: string;
  /** End-of-run verdict; falls back to a generic "done" label. */
  verdict?: (frames: Frame<S>[]) => { ok: boolean; label: string };
}

/**
 * Step-through prediction drill: the board shows the current frame; the student
 * picks which move the algorithm makes next. Reuses the plugin's own View, so it
 * works for any problem shape (graph, grid, array, tree, …).
 */
export function makeSimulatePanel<I, S>(config: SimulateConfig<I, S>) {
  const { inputs, record, View, question = 'Which move comes next?', verdict } = config;
  const panelId = config.id ?? 'simulate';

  return function SimulatePanel() {
    const { focusPanel, advancePractice } = useCanvasActions();
    const [inputId, setInputId] = useState(inputs[0].id);
    const input = inputs.find((g) => g.id === inputId) ?? inputs[0];
    const frames = useMemo(() => record(input.value), [input]);
    const [k, setK] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [wrong, setWrong] = useState<string | null>(null);

    const done = k >= frames.length - 1;
    const opt = useMemo(() => (done ? null : buildOptions(frames, k)), [frames, k, done]);
    const frame = frames[k];
    const move = frame.move;

    const choose = (note: string) => {
      if (done || !opt) return;
      focusPanel(panelId);
      if (note === opt.correct) {
        setK((x) => x + 1);
        setWrong(null);
      } else {
        setMistakes((m) => m + 1);
        setWrong(note);
        window.setTimeout(() => setWrong(null), 350);
      }
    };

    const pickInput = (id: string) => {
      setInputId(id);
      setK(0);
      setMistakes(0);
      setWrong(null);
    };

    const result = verdict?.(frames);

    useEffect(() => {
      if (!done) return;
      const t = window.setTimeout(() => advancePractice(panelId), FINISH_FOCUS_MS);
      return () => window.clearTimeout(t);
    }, [done, advancePractice]);

    return (
      <div className="simulate">
        <div className="sim-graphs">
          {inputs.map((g) => (
            <button
              key={g.id}
              className={`chip-btn ${g.id === inputId ? 'on' : ''}`}
              onClick={() => pickInput(g.id)}
            >
              {g.label.split(' · ')[0]}
            </button>
          ))}
          <span className="sim-meta">
            step {k + 1} / {frames.length} · {mistakes} mistakes
          </span>
        </div>

        <div className="sim-stage">
          <div className="sim-board-fit case-preview-fit">
            <VizFitBox
              className="viz-board-col viz-board-col--fit h-full min-h-[160px]"
              remeasureKey={`${inputId}-${k}-${move.type}`}
            >
              <View frame={frame} />
            </VizFitBox>
          </div>

          <div className="sim-side">
            <div className={`caption ${move.tone ?? 'default'}`}>
              <span className="sim-movenote">{move.note}</span>
              {move.caption}
            </div>

            {done ? (
              <div className="sim-finish">
                {result && <div className={`verdict ${result.ok ? 'ok' : 'bad'}`}>{result.label}</div>}
                <button className="primary" onClick={() => pickInput(inputId)}>
                  ↺ replay
                </button>
              </div>
            ) : (
              <>
                <p className="sim-q">{question}</p>
                <div className="sim-options">
                  {opt?.options.map((o) => (
                    <button
                      key={o}
                      className={`sim-option ${wrong === o ? 'shake-wrong' : ''}`}
                      onClick={() => choose(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
}

/* ------------------------------------------------------------------ Cases -- */

export interface WorkedCase<I> {
  id: string;
  title: string;
  input: I;
  /** Pretty one-line input label; falls back to JSON of `input`. */
  inputLabel?: string;
  question: string;
  answer: string;
  /** Result badge text, e.g. "returns true" / "3 subsets". */
  returns?: string;
  /** Badge tone. Default 'ok'. */
  tone?: 'ok' | 'bad';
}

export interface CasesConfig<I, S> {
  record: (input: I) => Frame<S>[];
  View: ComponentType<PluginViewProps<S>>;
  /** Primary worked examples (e.g. the "yes" cases). */
  good: WorkedCase<I>[];
  /** Optional contrasting examples (e.g. the "no" cases). */
  bad?: WorkedCase<I>[];
  goodLabel?: string;
  badLabel?: string;
  /** Optional teaching note shown above the cases. */
  intro?: string;
}

const END_PAUSE_MS = 1700;
// Auto-play tuning: cap a full loop to ~TARGET_LOOP_MS regardless of run length.
// Short runs play smoothly frame-by-frame; very long runs fast-forward by a
// stride so they still complete a loop in a watchable time. Scrub/step always
// keep full per-frame resolution.
const TARGET_LOOP_MS = 11000;
const TARGET_STEPS = 180;
const MIN_STEP_MS = 60;
const MAX_STEP_MS = 850;

const ctrlBtn =
  'nodrag grid h-6 w-6 shrink-0 place-items-center rounded-md border border-edge text-ink3 transition-colors hover:border-accent hover:text-ink';

/**
 * One worked example, ANIMATED: it auto-plays through the plugin's recorded run
 * (loop with a pause on the final frame), shows the live move caption, and gives
 * play/pause + step + scrub controls. Animation runs only while the card is in
 * view so a long gallery of cards stays cheap.
 */
function CaseCard<I, S>({
  c,
  record,
  View,
}: {
  c: WorkedCase<I>;
  record: (input: I) => Frame<S>[];
  View: ComponentType<PluginViewProps<S>>;
}) {
  const frames = useMemo(() => record(c.input), [c]);
  const tone = c.tone ?? 'ok';
  const label = c.inputLabel ?? JSON.stringify(c.input);
  const last = frames.length - 1;
  const animated = frames.length > 1;
  // Short runs advance one frame per tick; very long runs stride so a full loop
  // still finishes in ~TARGET_LOOP_MS without per-frame ticks dragging on.
  const stride = Math.max(1, Math.ceil(frames.length / TARGET_STEPS));
  const ticks = Math.min(frames.length, TARGET_STEPS);
  const stepDelay = Math.max(MIN_STEP_MS, Math.min(MAX_STEP_MS, Math.round(TARGET_LOOP_MS / ticks)));

  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only animate while the card is actually on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tick: advance by stride (clamped to land exactly on the last frame); on the
  // last frame, hold longer, then loop back to the start.
  useEffect(() => {
    if (!animated || !playing || !inView) return;
    const atEnd = k >= last;
    const t = window.setTimeout(
      () => setK((cur) => (cur >= last ? 0 : Math.min(last, cur + stride))),
      atEnd ? END_PAUSE_MS : stepDelay,
    );
    return () => window.clearTimeout(t);
  }, [animated, playing, inView, k, last, stride, stepDelay]);

  const frame = frames[Math.min(k, last)];
  const move = frame.move;
  const step = (d: number) => {
    setPlaying(false);
    setK((x) => Math.max(0, Math.min(last, x + d)));
  };

  return (
    <div ref={ref} className="flex flex-col gap-2 rounded-[var(--radius)] border border-edge bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-medium text-ink', vizText.base)}>{c.title}</span>
        {c.returns && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5',
              vizText.xs,
              vizText.mono,
              tone === 'ok' ? 'bg-goodbg text-good' : 'bg-badbg text-bad',
            )}
          >
            {c.returns}
          </span>
        )}
      </div>

      <div className="case-preview-fit overflow-hidden rounded-lg border border-edge bg-panel2/40">
        <VizFitBox
          className="viz-board-col viz-board-col--fit h-full min-h-[120px]"
          remeasureKey={`${c.id}-${k}-${move.type}`}
        >
          <View frame={frame} />
        </VizFitBox>
      </div>

      {animated && (
        <>
          <div
            className={cn(
              cn('border-l-2 pl-2 leading-snug', vizText.tight),
              move.tone === 'good'
                ? 'border-good text-good'
                : move.tone === 'bad'
                  ? 'border-bad text-bad'
                  : 'border-edge2 text-ink2',
            )}
          >
            <span className={cn('mr-1.5 text-ink3', vizText.xs, vizText.mono)}>
              {k + 1}/{frames.length}
            </span>
            <span className="font-medium text-ink">{move.note}</span>
            {move.caption ? ` — ${move.caption}` : ''}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={ctrlBtn}
              title={playing ? 'Pause' : 'Play'}
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button type="button" className={ctrlBtn} title="Step back" aria-label="Step back" onClick={() => step(-1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={ctrlBtn} title="Step forward" aria-label="Step forward" onClick={() => step(1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={last}
              value={Math.min(k, last)}
              onChange={(e) => {
                setPlaying(false);
                setK(Number(e.target.value));
              }}
              className="nodrag h-1 flex-1 cursor-pointer accent-accent"
              aria-label="Scrub frames"
            />
            <button
              type="button"
              className={ctrlBtn}
              title="Replay from start"
              aria-label="Replay from start"
              onClick={() => {
                setK(0);
                setPlaying(true);
              }}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      <code className={cn('block overflow-x-auto whitespace-nowrap font-mono text-ink2', vizText.tight)}>{label}</code>
      <p className={cn('leading-relaxed text-ink2', vizText.sm)}>
        <span className="mr-1.5 inline-block w-3 font-medium text-ink3">Q</span>
        {c.question}
      </p>
      <p className={cn('leading-relaxed text-ink2', vizText.sm)}>
        <span className="mr-1.5 inline-block w-3 font-medium text-ink3">A</span>
        {c.answer}
      </p>
    </div>
  );
}

/** A scrollable column of worked examples, one tab per case. */
export function makeCasesPanel<I, S>(config: CasesConfig<I, S>) {
  const { record, View, good, bad = [], intro } = config;

  return function CasesPanel() {
    const allCases = [...good, ...bad];
    const [activeId, setActiveId] = useState(allCases[0]?.id ?? '');
    const active = allCases.find((c) => c.id === activeId) ?? allCases[0];
    if (!active) return null;

    const tabOptions = allCases.map((c, i) => ({
      v: c.id,
      label: (
        <span className="inline-flex items-center gap-1" title={c.title}>
          <span className={cn('h-1.5 w-1.5 rounded-full', c.tone === 'bad' ? 'bg-bad' : 'bg-good')} />
          {i + 1}
        </span>
      ),
    }));

    return (
      <div className="cases-panel flex flex-col gap-3">
        {intro && <p className={cn('leading-relaxed text-ink2', vizText.sm)}>{intro}</p>}
        {allCases.length > 1 && (
          <div className="ws-scroll -mx-0.5 overflow-x-auto px-0.5">
            <MiniTabs value={active.id} options={tabOptions} onChange={setActiveId} />
          </div>
        )}
        <CaseCard key={active.id} c={active} record={record} View={View} />
      </div>
    );
  };
}
