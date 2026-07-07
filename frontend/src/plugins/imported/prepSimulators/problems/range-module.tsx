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
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type RangeOp =
  | { kind: 'add'; left: number; right: number }
  | { kind: 'query'; left: number; right: number }
  | { kind: 'remove'; left: number; right: number };

interface RangeInput {
  ops: RangeOp[];
}

interface RangeState {
  intervals: [number, number][];
  op: string;
  left: number | null;
  right: number | null;
  result: boolean | null;
  done: boolean;
}

function addRange(intervals: [number, number][], left: number, right: number): [number, number][] {
  const merged: [number, number][] = [];
  let i = 0;
  const n = intervals.length;
  while (i < n && intervals[i]![1] < left) {
    merged.push(intervals[i]!);
    i++;
  }
  while (i < n && intervals[i]![0] <= right) {
    left = Math.min(left, intervals[i]![0]);
    right = Math.max(right, intervals[i]![1]);
    i++;
  }
  merged.push([left, right]);
  while (i < n) {
    merged.push(intervals[i]!);
    i++;
  }
  return merged;
}

function queryRange(intervals: [number, number][], left: number, right: number): boolean {
  let lo = 0;
  let hi = intervals.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (intervals[mid]![1] <= left) lo = mid + 1;
    else hi = mid;
  }
  return lo < intervals.length && intervals[lo]![0] <= left && intervals[lo]![1] >= right;
}

function removeRange(
  intervals: [number, number][],
  left: number,
  right: number,
): [number, number][] {
  const result: [number, number][] = [];
  for (const iv of intervals) {
    if (iv[1]! <= left || iv[0]! >= right) {
      result.push(iv);
    } else {
      if (iv[0]! < left) result.push([iv[0]!, left]);
      if (iv[1]! > right) result.push([right, iv[1]!]);
    }
  }
  return result;
}

function record({ ops }: RangeInput): Frame<RangeState>[] {
  let intervals: [number, number][] = [];

  const { emit, frames } = createPrepRecorder<RangeState>(() => ({
    intervals: intervals.map((x) => [...x] as [number, number]),
    op: '',
    left: null,
    right: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    `Range Module: sorted merged intervals. AddRange merges overlaps; QueryRange checks coverage; RemoveRange splits intervals.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'add') {
      intervals = addRange(intervals, o.left, o.right);
      emit(
        'ADD',
        `[${o.left},${o.right}]`,
        `AddRange(${o.left},${o.right}): merge into sorted intervals → [${intervals.map((x) => `[${x[0]!},${x[1]!}]`).join(', ')}].`,
        {
          op: `add [${o.left},${o.right}]`,
          left: o.left,
          right: o.right,
          intervals: intervals.map((x) => [...x] as [number, number]),
        },
      );
    } else if (o.kind === 'query') {
      const ok = queryRange(intervals, o.left, o.right);
      emit(
        ok ? 'QUERY' : 'MISS',
        String(ok),
        `QueryRange(${o.left},${o.right}): ${ok ? 'fully covered' : 'not covered'} → ${ok}.`,
        {
          op: `query [${o.left},${o.right}]`,
          left: o.left,
          right: o.right,
          result: ok,
          intervals: intervals.map((x) => [...x] as [number, number]),
        },
        ok ? 'good' : 'bad',
      );
    } else {
      intervals = removeRange(intervals, o.left, o.right);
      emit(
        'REMOVE',
        `[${o.left},${o.right}]`,
        `RemoveRange(${o.left},${o.right}): carve hole → [${intervals.map((x) => `[${x[0]!},${x[1]!}]`).join(', ')}].`,
        {
          op: `remove [${o.left},${o.right}]`,
          left: o.left,
          right: o.right,
          intervals: intervals.map((x) => [...x] as [number, number]),
        },
      );
    }
  }

  emit('DONE', `${intervals.length} intervals`, `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RangeState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && (
          <span className={cn('ml-2 font-mono', s.result ? 'text-good' : 'text-bad')}>
            {String(s.result)}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {s.intervals.map(([a, b], i) => (
          <div
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              s.left !== null && a <= s.left && b >= (s.right ?? 0)
                ? 'border-accent bg-accentbg'
                : 'border-edge',
            )}
          >
            [{a}, {b}]
          </div>
        ))}
        {s.intervals.length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RangeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="intervals" v={s.intervals.length} />
      <InspectorRow k="result" v={s.result === null ? '—' : String(s.result)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-range-module';
export const title = 'Range Module';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Range Module"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
      {
        label: 'Trie phone directory autocomplete — different approach',
      },
    ],
    explain: 'See Range Module pattern',
  },
  {
    id: 'key-step',
    prompt: 'On the "REMOVE" step ([,]), what happens?',
    choices: [
      {
        label: 'RemoveRange(,): carve hole → — this move caption',
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
    explain: 'RemoveRange(,): carve hole → [${intervals.map((x) => ',
  },
  {
    id: 'state',
    prompt: 'What does the `intervals` field track in the visualization state?',
    choices: [
      {
        label: 'Field intervals in state — updated each frame',
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
      'The recorder snapshots `intervals` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. — final DONE caption',
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
    explain: 'Done.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rm1',
      label: 'add, query, remove',
      value: {
        ops: [
          { kind: 'add', left: 10, right: 20 },
          { kind: 'add', left: 15, right: 25 },
          { kind: 'query', left: 12, right: 18 },
          { kind: 'remove', left: 14, right: 16 },
        ],
      },
    },
  ] satisfies SampleInput<RangeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RangeState | undefined;
    return s?.done
      ? { ok: true, label: `${s.intervals.length} intervals` }
      : { ok: false, label: 'incomplete' };
  },
};
