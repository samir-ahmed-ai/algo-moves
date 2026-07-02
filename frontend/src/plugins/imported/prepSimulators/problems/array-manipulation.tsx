import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';

interface ArrayManipulationInput {
  n: number;
  queries: [number, number, number][]; // [a, b, k] — add k to range [a, b] (1-indexed)
}

type Phase = 'queries' | 'sweep';

interface ArrayManipulationState {
  n: number;
  queries: [number, number, number][];
  diff: number[]; // difference array, length n + 2 (1-indexed; index 0 unused)
  phase: Phase;
  qIdx: number | null; // which query is being applied
  markA: number | null; // diff index that just got += k (= a)
  markB: number | null; // diff index that just got -= k (= b+1)
  i: number | null; // current index in the prefix-sum sweep
  cur: number; // running prefix sum at i
  res: number; // best (max) value seen so far
  done: boolean;
}

function record({ n, queries }: ArrayManipulationInput): Frame<ArrayManipulationState>[] {  const diff = new Array<number>(n + 2).fill(0);

  const { emit, frames } = createRecorder<ArrayManipulationState>(() => ({
        n,
        queries,
        diff: diff.slice(),
        phase: 'queries',
        qIdx: null,
        markA: null,
        markB: null,
        i: null,
        cur: 0,
        res: 0,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}, ${queries.length} queries`,
    `Array Manipulation: start with ${n} zeros, then apply ${queries.length} range-add queries [a,b,k] (each adds k to positions a..b). Instead of touching every cell per query, keep a difference array: diff[a] += k and diff[b+1] -= k mark only the two boundaries where the running total changes.`,
    { phase: 'queries' },
  );

  // Phase 1 — fold every query into the difference array.
  for (let q = 0; q < queries.length; q++) {
    const [a, b, k] = queries[q];
    diff[a] += k;
    diff[b + 1] -= k;
    emit(
      'QUERY',
      `[${a},${b},+${k}]`,
      `Query ${q + 1} = add ${k} to positions ${a}..${b}. We record diff[${a}] += ${k} (the value rises here) and diff[${b + 1}] -= ${k} (it falls right after position ${b}). Only two indices change, regardless of how wide the range is.`,
      { phase: 'queries', qIdx: q, markA: a, markB: b + 1 },
    );
  }

  // Phase 2 — prefix-sum the difference array, tracking the running max.
  let cur = 0;
  let res = 0;
  emit(
    'SWEEP_START',
    'prefix sum',
    `Now sweep left to right taking a running prefix sum of the difference array. At each position i the prefix sum equals the actual array value there. We watch for the largest value as we go.`,
    { phase: 'sweep', i: null, cur: 0, res: 0 },
  );

  for (let i = 1; i <= n; i++) {
    cur += diff[i];
    const improved = cur > res;
    if (improved) res = cur;
    emit(
      improved ? 'MAX' : 'STEP',
      `i=${i}, cur=${cur}, max=${res}`,
      improved
        ? `Position ${i}: cur += diff[${i}] (=${diff[i]}) → value ${cur}. That beats the previous best, so the running maximum becomes ${res}.`
        : `Position ${i}: cur += diff[${i}] (=${diff[i]}) → value ${cur}. The best so far is still ${res}.`,
      { phase: 'sweep', i, cur, res },
      improved ? 'good' : undefined,
    );
  }

  emit(
    'DONE',
    `max=${res}`,
    `The sweep is complete. The largest value any position ever held is ${res} — that is the answer, found in O(n+m) time using only the difference array.`,
    { phase: 'sweep', i: null, cur, res, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ArrayManipulationState>) {
  const s = frame.state;
  // Show diff indices 1..n (the meaningful, in-bounds positions) plus index n+1
  // when a query's b+1 boundary lands there, so the -= k is visible.
  const lastIdx = s.diff.length - 1; // n + 1
  const cells = s.diff.slice(1, lastIdx + 1); // indices 1..n+1
  const toCell = (idx: number) => idx - 1; // diff index -> cell index in `cells`

  const pointers: ArrayPointer[] = [];
  if (s.phase === 'queries') {
    if (s.markA !== null && s.markA >= 1 && s.markA <= lastIdx)
      pointers.push({ i: toCell(s.markA), label: '+k', tone: 'good', place: 'above' });
    if (s.markB !== null && s.markB >= 1 && s.markB <= lastIdx)
      pointers.push({ i: toCell(s.markB), label: '−k', tone: 'bad', place: 'below' });
  } else if (s.i !== null && s.i >= 1 && s.i <= lastIdx) {
    pointers.push({ i: toCell(s.i), label: 'i', tone: 'accent', place: 'above' });
  }

  const tone = (cell: number) => {
    const idx = cell + 1; // back to diff index
    if (s.phase === 'queries') {
      if (s.markA === idx) return 'lo';
      if (s.markB === idx) return 'hi';
      return '';
    }
    if (s.i !== null && idx === s.i) return s.cur === s.res && s.cur > 0 ? 'found' : 'match';
    if (s.i !== null && idx < s.i) return 'dead';
    return '';
  };

  const queryLine = s.queries
    .map(([a, b, k], q) => (s.qIdx === q ? `[${a},${b},${k}]◂` : `[${a},${b},${k}]`))
    .join('  ');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {' · '}phase ={' '}
        <span className="font-mono text-ink">{s.phase === 'queries' ? 'build diff[]' : 'prefix-sum sweep'}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>diff[] (indices 1…{lastIdx})</div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>queries {queryLine || '—'}</div>
      <div className={cn('mt-1 font-mono', vizText.sm)}>
        <span className="text-ink3">cur = </span>
        <span className="text-ink">{s.phase === 'sweep' ? s.cur : '—'}</span>
        <span className="text-ink3">{'  ·  '}max = </span>
        <span className={cn(s.done ? 'text-good' : 'text-ink')}>{s.res}</span>
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.res}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ArrayManipulationState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="phase" v={s.phase === 'queries' ? 'build diff[]' : 'prefix sum'} />
      <InspectorRow k="query #" v={s.qIdx !== null ? s.qIdx + 1 : '—'} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="cur (prefix)" v={s.phase === 'sweep' ? s.cur : '—'} />
      <InspectorRow k="max" v={s.res} />
    </VarGrid>
  );
}

function computeAnswer({ n, queries }: ArrayManipulationInput): number {
  const diff = new Array<number>(n + 2).fill(0);
  for (const [a, b, k] of queries) {
    diff[a] += k;
    diff[b + 1] -= k;
  }
  let cur = 0;
  let res = 0;
  for (let i = 1; i <= n; i++) {
    cur += diff[i];
    if (cur > res) res = cur;
  }
  return res;
}

export const manifestId = 'prep-prefix-sum-array-manipulation';
export const title = 'Array Manipulation (HackerRank)';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'am1',
      label: 'n=5, 3 queries',
      value: {
        n: 5,
        queries: [
          [1, 2, 100],
          [2, 5, 100],
          [3, 4, 100],
        ],
      },
    },
    {
      id: 'am2',
      label: 'n=8, 3 queries',
      value: {
        n: 8,
        queries: [
          [1, 5, 3],
          [4, 8, 7],
          [6, 7, 1],
        ],
      },
    },
  ] satisfies SampleInput<ArrayManipulationInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ArrayManipulationState | undefined;
    const label = s ? `max = ${s.res}` : 'max = 0';
    return { ok: true, label };
  },
};

// Reference for the documented O(n+m) / O(n) approach; verdict reads the last frame.
void computeAnswer;
