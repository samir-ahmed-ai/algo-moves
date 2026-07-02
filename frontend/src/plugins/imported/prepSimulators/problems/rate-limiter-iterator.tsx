import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { QueueTape } from '../../../../components/QueueTape';
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

function record({ source, rate, burst, stepSec }: RateLimitInput): Frame<RateLimitState>[] {  let index = 0;
  let tokens = burst;
  let elapsed = 0;
  const output: number[] = [];

  const { emit, frames } = createRecorder<RateLimitState>(() => ({
        source,
        index,
        rate,
        burst,
        tokens,
        elapsed,
        output: output.slice(),
        waiting: false,
        done: false
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
      const val = source[index];
      output.push(val);
      index++;
      emit(
        'YIELD',
        `→ ${val}`,
        `tokens ≥ 1 — spend 1 token, yield source[${index - 1}] = ${val}. Remaining tokens = ${tokens.toFixed(1)}.`,
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
        <div className="mt-0.5 font-mono text-ink">{s.tokens.toFixed(1)} / {s.burst}</div>
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

export const simulator: ProblemSimulator = {
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
