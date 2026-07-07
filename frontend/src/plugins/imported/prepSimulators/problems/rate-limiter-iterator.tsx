import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { QueueTape } from '../../../../components/board/QueueTape';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RateLimitInput {
  source: number[];
  /** Tokens added per simulated second. */
  rate: number;
  burst: number;
  /** Simulated elapsed seconds between each next() attempt (discrete time). */
  stepSec: number;
}

interface RateLimitState {
  source: number[];
  index: number;
  rate: number;
  burst: number;
  tokens: number;
  elapsed: number;
  output: number[];
  waiting: boolean;
  done: boolean;
}

function record({ source, rate, burst, stepSec }: RateLimitInput): Frame<RateLimitState>[] {
  let index = 0;
  let tokens = burst;
  let elapsed = 0;
  const output: number[] = [];

  const { emit, frames } = createPrepRecorder<RateLimitState>(() => ({
    source,
    index,
    rate,
    burst,
    tokens,
    elapsed,
    output: output.slice(),
    waiting: false,
    done: false,
  }));

  emit(
    'INIT',
    `tokens=${burst}`,
    `Rate limiter iterator: token bucket starts full at burst=${burst}. \`refill()\` adds \`elapsed*rate\` tokens capped at burst; each item costs 1 token.`,
    { tokens: burst },
  );

  while (index < source.length) {
    elapsed += stepSec;
    tokens = Math.min(burst, tokens + stepSec * rate);
    emit(
      'REFILL',
      `tokens=${tokens.toFixed(1)}`,
      `Refill: elapsed += ${stepSec}s → tokens = min(burst, tokens + elapsed*rate) = ${tokens.toFixed(1)}.`,
      { elapsed, tokens },
    );

    if (tokens >= 1) {
      tokens -= 1;
      const val = source[index]!;
      output.push(val!);
      index++;
      emit(
        'YIELD',
        `→ ${val}`,
        `tokens ≥ 1 — spend 1 token, yield source[${index - 1}]! = ${val}. Remaining tokens = ${tokens.toFixed(1)}.`,
        { index, tokens, output: output.slice() },
        'good',
      );
    } else {
      emit(
        'WAIT',
        'tokens < 1',
        `Not enough tokens (${tokens.toFixed(1)} < 1) — sleep and retry refill on next tick.`,
        { waiting: true, tokens },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `[${output.join(', ')}]`,
    `Source exhausted. Rate-limited output: [${output.join(', ')}].`,
    { output: output.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RateLimitState>) {
  const s = frame.state;
  const pending = s.source.slice(s.index);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        rate = {s.rate}/s · burst = {s.burst} · elapsed = {s.elapsed}s
      </div>
      <div className={cn('rounded border border-line bg-surface2 p-2', vizText.sm)}>
        <div className="text-ink3">tokens</div>
        <div className="mt-1 h-3 overflow-hidden rounded bg-surface">
          <div
            className={cn('h-full transition-all', s.waiting ? 'bg-bad' : 'bg-good')}
            style={{ width: `${Math.min(100, (s.tokens / s.burst) * 100)}%` }}
          />
        </div>
        <div className="mt-0.5 font-mono text-ink">
          {s.tokens.toFixed(1)} / {s.burst}
        </div>
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>source (index={s.index})</div>
      <QueueTape items={pending} label="pending · head →" />
      <div className={cn('mt-1 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        yielded [{s.output.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RateLimitState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="index" v={s.index} />
      <InspectorRow k="tokens" v={s.tokens.toFixed(2)} />
      <InspectorRow k="elapsed" v={`${s.elapsed}s`} />
      <InspectorRow k="waiting" v={s.waiting ? 'yes' : 'no'} />
      <InspectorRow k="yielded" v={s.output.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-rate-limiter-iterator';
export const title = 'Rate limiter iterator';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Rate limiter iterator"?',
    choices: [
      {
        label: 'Token bucket rate limiter — fits this problem',
        correct: true,
      },
      {
        label: 'In-place byte reversal — different approach',
      },
      {
        label: 'Streaming palindrome stack — different approach',
      },
      {
        label: 'Min-heap size k — different approach',
      },
    ],
    explain: 'Bucket refills tokens by elapsed time; spend one per item',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Rate limiter iterator), what strategy is established?',
    choices: [
      {
        label: 'Bucket refills tokens by elapsed time; — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain: 'Rate limiter iterator: token bucket starts full at burst=. \\',
  },
  {
    id: 'key-step',
    prompt: 'On the "YIELD" step (→ ), what happens?',
    choices: [
      {
        label: 'tokens ≥ 1 — spend 1 — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain: 'tokens ≥ 1 — spend 1 token, yield source[] = . Remaining tokens = .',
  },
  {
    id: 'state',
    prompt: 'What does the `source` field track in the visualization state?',
    choices: [
      {
        label: 'Field source in state — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain:
      'The recorder snapshots `source` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Rate limiter iterator"?',
    choices: [
      {
        label: 'O(1) per item time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(entries) time, O(depth) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(1) per item. O(1). tokens=min(burst, tokens+elapsed*rate); wait until tokens>=1',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Source exhausted. Rate-limited output: []. — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'Source exhausted. Rate-limited output: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rl1',
      label: 'burst=2, rate=1, step=0.5s',
      value: { source: [1, 2, 3, 4, 5], rate: 1, burst: 2, stepSec: 0.5 },
    },
    {
      id: 'rl2',
      label: 'burst=1, rate=2, step=0.25s',
      value: { source: [10, 20, 30], rate: 2, burst: 1, stepSec: 0.25 },
    },
  ] satisfies SampleInput<RateLimitInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RateLimitState | undefined;
    return s?.done && s.output.length === s.source.length
      ? { ok: true, label: `[${s.output.join(', ')}]` }
      : { ok: false, label: 'incomplete' };
  },
};
