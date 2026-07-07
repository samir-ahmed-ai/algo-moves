import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { DualHeapBoard } from '../../../_shared/dualHeapBoard';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

  const { emit, frames } = createRecorder<StockState>(() => ({
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
      records[o.timestamp] = o.price;
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
      const cur = records[latestTime];
      emit(
        'CURRENT',
        String(cur),
        `Current(): latest timestamp ${latestTime} → price ${cur}.`,
        { op: 'current', result: cur, latestTime },
        'good',
      );
    } else if (o.kind === 'maximum') {
      maxH.sort((a, b) => b.price - a.price);
      while (maxH.length > 0 && records[maxH[0].timestamp] !== maxH[0].price) maxH.shift();
      const mx = maxH[0]?.price ?? 0;
      emit(
        'MAX',
        String(mx),
        `Maximum(): pop stale max-heap tops until records[timestamp]==price → ${mx}.`,
        { op: 'maximum', result: mx, highlightMax: true, maxH: maxH.map((x) => ({ ...x })) },
        'good',
      );
    } else {
      minH.sort((a, b) => a.price - b.price);
      while (minH.length > 0 && records[minH[0].timestamp] !== minH[0].price) minH.shift();
      const mn = minH[0]?.price ?? 0;
      emit(
        'MIN',
        String(mn),
        `Minimum(): pop stale min-heap tops until records[timestamp]==price → ${mn}.`,
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">{s.result}</span>}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>latest @ {s.latestTime}</div>
      <DualHeapBoard
        low={maxPrices.slice(0, 5)}
        high={minPrices.slice(0, 5)}
        highlightLow={s.highlightMax}
        highlightHigh={s.highlightMin}
      />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>records</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {Object.entries(s.records)
          .sort((a, b) => +a[0] - +b[0])
          .map(([t, p]) => (
            <span
              key={t}
              className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
            >
              @{t}:{p}
            </span>
          ))}
      </div>
    </div>
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
    prompt: 'Which approach fits "Stock Price Fluctuation"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
    ],
    explain: 'See Stock Price Fluctuation pattern',
  },
  {
    id: 'key-step',
    prompt: 'On the "UPDATE" step (@=), what happens?',
    choices: [
      {
        label: 'Update(, ): store price, push lazy — this move caption',
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
    explain: 'Update(, ): store price, push lazy heaps, latestTime=.',
  },
  {
    id: 'state',
    prompt: 'What does the `records` field track in the visualization state?',
    choices: [
      {
        label: 'Field records in state — updated each frame',
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
      'The recorder snapshots `records` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Update(, ): store price, push lazy — final DONE caption',
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
    explain: 'Update(, ): store price, push lazy heaps, latestTime=.',
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
