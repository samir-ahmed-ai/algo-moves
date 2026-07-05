import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';

interface MergeInput {
  /** First m entries are the real values of a; the rest are 0-padding slots to fill. */
  a: number[];
  m: number;
  b: number[];
  n: number;
}

interface MergeState {
  a: number[]; // a, mutated in place as we merge from the back
  b: number[];
  m: number;
  n: number;
  i: number | null; // tail pointer into a's real prefix (a[0..m-1])
  j: number | null; // tail pointer into b
  k: number | null; // write pointer into a (from the back)
  filled: boolean[]; // which a-slots have been written this run
  chose: 'a' | 'b' | null; // which source supplied a[k] this step
  done: boolean;
}

function record({ a, m, b, n }: MergeInput): Frame<MergeState>[] {
  const work = a.slice();  const filled = new Array<boolean>(work.length).fill(false);

  const { emit, frames } = createRecorder<MergeState>(() => ({
        a: work.slice(),
        b,
        m,
        n,
        i: null,
        j: null,
        k: null,
        filled: filled.slice(),
        chose: null,
        done: false
      }));

  let i = m - 1;
  let j = n - 1;
  let k = m + n - 1;

  emit(
    'INIT',
    `m=${m}, n=${n}`,
    `Merge ${n} values of b into a, which holds ${m} real values followed by ${n} empty slots. Walk all three pointers from the back: i over a's prefix, j over b, k over a's write position. Writing largest-first means we never overwrite an a-value we still need.`,
    { i, j, k },
  );

  while (j >= 0) {
    if (i >= 0 && work[i] > b[j]) {
      emit(
        'COMPARE',
        `a[${i}]=${work[i]} > b[${j}]=${b[j]}`,
        `a[${i}] = ${work[i]} is larger than b[${j}] = ${b[j]}, so a[${i}] is the biggest remaining value. It belongs at a[${k}].`,
        { i, j, k, chose: 'a' },
      );
      work[k] = work[i];
      filled[k] = true;
      emit(
        'WRITE',
        `a[${k}]=${work[k]}`,
        `Place ${work[k]} at a[${k}] and step i back to ${i - 1}.`,
        { i: i - 1, j, k, filled: filled.slice(), chose: 'a' },
      );
      i--;
    } else {
      const reason =
        i < 0
          ? `a's prefix is exhausted (i < 0), so the rest of b just drops in.`
          : `b[${j}] = ${b[j]} is at least a[${i}] = ${work[i]}, so b[${j}] is the biggest remaining value.`;
      emit(
        'COMPARE',
        i >= 0 ? `b[${j}]=${b[j]} ≥ a[${i}]=${work[i]}` : `b[${j}]=${b[j]} (a done)`,
        `${reason} It belongs at a[${k}].`,
        { i, j, k, chose: 'b' },
      );
      work[k] = b[j];
      filled[k] = true;
      emit(
        'WRITE',
        `a[${k}]=${work[k]}`,
        `Place ${work[k]} at a[${k}] and step j back to ${j - 1}.`,
        { i, j: j - 1, k, filled: filled.slice(), chose: 'b' },
      );
      j--;
    }
    k--;
  }

  emit(
    'DONE',
    `merged [${work.join(',')}]`,
    `j has run out, so every b-value is placed. Any a-values below k were already in order and never needed to move. a is now fully sorted: [${work.join(', ')}].`,
    { i, j, k, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MergeState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0 && !s.done)
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.k !== null && s.k >= 0 && !s.done)
    pointers.push({ i: s.k, label: 'k', tone: 'warn', place: 'below' });

  const cellTone = (idx: number) => {
    if (s.done) return 'found';
    if (s.k === idx) return 'match';
    if (s.filled[idx]) return 'in-window';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        a (length {s.a.length}, {s.m} real + {s.n} slots) — merge from the back
      </div>
      <ArrayRow values={s.a} cellTone={cellTone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        b{' = ['}
        {s.b.map((v, idx) => (
          <span key={idx} className={s.j === idx && !s.done ? 'text-accent' : 'text-ink'}>
            {idx > 0 ? ', ' : ''}
            {v}
          </span>
        ))}
        {']'}
        {s.j !== null && s.j >= 0 && !s.done && (
          <span className="text-ink3">
            {'  '}
            (j = {s.j})
          </span>
        )}
      </div>
      {s.chose && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          took larger from{' '}
          <span className={s.chose === 'a' ? 'text-accent' : 'text-good'}>{s.chose}</span> → a[{s.k}]
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ [{s.a.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MergeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const aiVal = s.i !== null && s.i >= 0 && s.i < s.a.length ? s.a[s.i] : '—';
  const bjVal = s.j !== null && s.j >= 0 && s.j < s.b.length ? s.b[s.j] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i (a tail)" v={s.i ?? '—'} />
      <InspectorRow k="a[i]" v={aiVal} />
      <InspectorRow k="j (b tail)" v={s.j ?? '—'} />
      <InspectorRow k="b[j]" v={bjVal} />
      <InspectorRow k="k (write)" v={s.k ?? '—'} />
      <InspectorRow k="source" v={s.chose ?? '—'} />
      <InspectorRow k="result" v={s.done ? `[${s.a.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-merge-two-sorted-arrays';
export const title = 'Merge two sorted arrays';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'm1',
      label: '[1,2,3,_,_,_] + [2,5,6]',
      value: { a: [1, 2, 3, 0, 0, 0], m: 3, b: [2, 5, 6], n: 3 },
    },
    {
      id: 'm2',
      label: '[4,5,6,_,_] + [1,2]',
      value: { a: [4, 5, 6, 0, 0], m: 3, b: [1, 2], n: 2 },
    },
  ] satisfies SampleInput<MergeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const sorted = s.a.every((v, idx) => idx === 0 || s.a[idx - 1] <= v);
    return { ok: sorted, label: `[${s.a.join(', ')}]` };
  },
};
