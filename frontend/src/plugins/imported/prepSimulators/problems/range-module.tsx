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
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={String(s.result)} tone={s.result ? 'good' : 'bad'} />
        </RailGroup>
      )}
      <RailGroup label="ranges">
        <RailStat k="count" v={s.intervals.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
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
    </VizStage>
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
    prompt: 'How does Range Module represent tracked numbers?',
    choices: [
      {
        label: 'Sorted merged intervals — non-overlapping inclusive ranges',
        correct: true,
      },
      {
        label: 'Jump-pointer on a line — skip painted coordinate cells',
      },
      {
        label: 'Per-cell snap history — binary search by snapId',
      },
      {
        label: 'Point frequency map — count diagonal square partners',
      },
    ],
    explain:
      'AddRange merges overlaps; RemoveRange splits intervals; QueryRange checks one covering interval.',
  },
  {
    id: 'key-step',
    prompt: 'What does RemoveRange do to overlapping intervals?',
    choices: [
      {
        label: 'Carve a hole — split intervals that straddle the removed span',
        correct: true,
      },
      {
        label: 'Delete entire list — clear all intervals on any remove',
      },
      {
        label: 'Merge removed span — AddRange treats remove like add',
      },
      {
        label: 'Binary search query path — lookup without mutating storage',
      },
    ],
    explain:
      'Intervals fully outside the hole stay; partial overlaps become left and right remnant pieces.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for Range Module operations?',
    choices: [
      {
        label: 'O(n) per op time, O(n) intervals space — linear scan or merge',
        correct: true,
      },
      {
        label: 'O(1) all ops, O(1) space — constant-size interval store',
      },
      {
        label: 'O(log n) only, O(1) space — tree without stored intervals',
      },
      {
        label: 'O(n log n) per query, O(n²) space — materialize every integer',
      },
    ],
    explain:
      'Add, remove, and query each walk the interval list; count stays bounded by interval count.',
  },
  {
    id: 'edge',
    prompt: 'How does QueryRange decide full coverage of [left, right]?',
    choices: [
      {
        label: 'Binary search interval — one interval covers left through right',
        correct: true,
      },
      {
        label: 'Sum interval lengths — total width must equal right minus left',
      },
      {
        label: 'Check left endpoint alone — ignore right boundary alignment',
      },
      {
        label: 'Require exact interval match — query span equals stored span',
      },
    ],
    explain: 'queryRange binary-searches for an interval with start ≤ left and end ≥ right.',
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
