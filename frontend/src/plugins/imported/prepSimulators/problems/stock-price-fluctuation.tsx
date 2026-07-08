import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { DualHeapBoard } from '../../../_shared/dualHeapBoard';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

type StockOp =
  | { kind: 'update'; timestamp: number; price: number }
  | { kind: 'current' }
  | { kind: 'maximum' }
  | { kind: 'minimum' };

interface StockInput {
  ops: StockOp[];
}

interface HeapEntry {
  price: number;
  timestamp: number;
}

interface StockState {
  records: Record<number, number>;
  latestTime: number;
  maxH: HeapEntry[];
  minH: HeapEntry[];
  op: string;
  result: number | null;
  highlightMax: boolean;
  highlightMin: boolean;
  done: boolean;
}

function record({ ops }: StockInput): Frame<StockState>[] {
  const records: Record<number, number> = {};
  let latestTime = 0;
  let maxH: HeapEntry[] = [];
  let minH: HeapEntry[] = [];

  const { emit, frames } = createPrepRecorder<StockState>(() => ({
    records: { ...records },
    latestTime,
    maxH: maxH.map((x) => ({ ...x })),
    minH: minH.map((x) => ({ ...x })),
    op: '',
    result: null,
    highlightMax: false,
    highlightMin: false,
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    `Stock Price Fluctuation: map timestamp→price, track latestTime. Lazy heaps for max/min — pop stale entries on query.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'update') {
      records[o.timestamp]! = o.price;
      if (o.timestamp > latestTime) latestTime = o.timestamp;
      maxH.push({ price: o.price, timestamp: o.timestamp });
      minH.push({ price: o.price, timestamp: o.timestamp });
      emit(
        'UPDATE',
        `@${o.timestamp}=${o.price}`,
        `Update(${o.timestamp}, ${o.price}): store price, push lazy heaps, latestTime=${latestTime}.`,
        { op: `update ${o.timestamp}=${o.price}`, records: { ...records }, latestTime },
      );
    } else if (o.kind === 'current') {
      const cur = records[latestTime]!;
      emit(
        'CURRENT',
        String(cur),
        `Current(): latest timestamp ${latestTime} → price ${cur}.`,
        { op: 'current', result: cur, latestTime },
        'good',
      );
    } else if (o.kind === 'maximum') {
      maxH.sort((a, b) => b.price - a.price);
      while (maxH.length > 0 && records[maxH[0]!.timestamp] !== maxH[0]!.price) maxH.shift();
      const mx = maxH[0]?.price ?? 0;
      emit(
        'MAX',
        String(mx),
        `Maximum(): pop stale max-heap tops until records[timestamp]!==price → ${mx}.`,
        { op: 'maximum', result: mx, highlightMax: true, maxH: maxH.map((x) => ({ ...x })) },
        'good',
      );
    } else {
      minH.sort((a, b) => a.price - b.price);
      while (minH.length > 0 && records[minH[0]!.timestamp] !== minH[0]!.price) minH.shift();
      const mn = minH[0]?.price ?? 0;
      emit(
        'MIN',
        String(mn),
        `Minimum(): pop stale min-heap tops until records[timestamp]!==price → ${mn}.`,
        { op: 'minimum', result: mn, highlightMin: true, minH: minH.map((x) => ({ ...x })) },
        'good',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<StockState>) {
  const s = frame.state;
  const maxPrices = [...s.maxH].sort((a, b) => b.price - a.price).map((e) => e.price);
  const minPrices = [...s.minH].sort((a, b) => a.price - b.price).map((e) => e.price);
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="price">
        <RailStat k="latest" v={`@${s.latestTime}`} />
        <RailStat k="records" v={Object.keys(s.records).length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <DualHeapBoard
        low={maxPrices.slice(0, 5)}
        high={minPrices.slice(0, 5)}
        highlightLow={s.highlightMax}
        highlightHigh={s.highlightMin}
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(s.records)
          .sort((a, b) => +a[0]! - +b[0]!)
          .map(([t, p]) => (
            <span
              key={t}
              className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
            >
              @{t}:{p}
            </span>
          ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<StockState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="latest" v={s.latestTime} />
      <InspectorRow k="result" v={s.result ?? '—'} />
      <InspectorRow k="records" v={Object.keys(s.records).length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-stock-price-fluctuation';
export const title = 'Stock Price Fluctuation';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structures track stock prices over time here?',
    choices: [
      {
        label: 'Timestamp map plus lazy heaps — records and min/max heaps',
        correct: true,
      },
      {
        label: 'Dual median heaps — low and high halves of price stream',
      },
      {
        label: 'Sorted booking intervals — half-open overlap calendar',
      },
      {
        label: 'Jump-pointer line — count newly painted coordinate cells',
      },
    ],
    explain:
      'records[timestamp]=price with latestTime; maxH/minH store lazy entries cleaned on query.',
  },
  {
    id: 'key-step',
    prompt: 'On MAXIMUM query, how is the answer found?',
    choices: [
      {
        label: 'Pop stale heap tops — until records[timestamp] matches heap price',
        correct: true,
      },
      {
        label: 'Scan all records — linear max without using heaps',
      },
      {
        label: 'Return latestTime price — most recent update always wins',
      },
      {
        label: 'Sort maxH fully — rebuild heap from scratch each query',
      },
    ],
    explain:
      'While records[maxH[0].timestamp] !== maxH[0].price, shift removes outdated heap entries.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for Stock Price Fluctuation?',
    choices: [
      {
        label: 'O(log n) update, amortized query cleanup, O(n) space — lazy heaps',
        correct: true,
      },
      {
        label: 'O(1) all ops, O(1) space — single variable tracks min/max',
      },
      {
        label: 'O(n) every query, O(1) space — no auxiliary heap storage',
      },
      {
        label: 'O(n log n) per update, O(n²) space — copy full history tree',
      },
    ],
    explain:
      'Update pushes heap entries O(1); maximum/minimum may discard several stale tops amortized.',
  },
  {
    id: 'edge',
    prompt: 'What does Current() return after several updates?',
    choices: [
      {
        label: 'Price at latestTime — not necessarily the global max timestamp key',
        correct: true,
      },
      {
        label: 'Maximum heap top — same value as Maximum() always',
      },
      {
        label: 'First update price — earliest timestamp in records map',
      },
      {
        label: 'Average of min and max heap — midpoint of extrema heaps',
      },
    ],
    explain:
      'Current reads records[latestTime] where latestTime tracks the greatest update timestamp seen.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'stk1',
      label: 'update + min/max/current',
      value: {
        ops: [
          { kind: 'update', timestamp: 1, price: 10 },
          { kind: 'update', timestamp: 2, price: 5 },
          { kind: 'maximum' },
          { kind: 'minimum' },
          { kind: 'current' },
        ],
      },
    },
  ] satisfies SampleInput<StockInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as StockState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};
