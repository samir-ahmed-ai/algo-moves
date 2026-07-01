import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SparseInput {
  nums1: number[];
  nums2: number[];
}

interface SparseState {
  pairs1: [number, number][];
  pairs2: [number, number][];
  i: number;
  j: number;
  acc: number;
  op: string;
  result: number | null;
  done: boolean;
}

function toPairs(nums: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < nums.length; i++) if (nums[i] !== 0) pairs.push([i, nums[i]]);
  return pairs;
}

function record({ nums1, nums2 }: SparseInput): Frame<SparseState>[] {
  const frames: Frame<SparseState>[] = [];
  const pairs1 = toPairs(nums1);
  const pairs2 = toPairs(nums2);
  let i = 0;
  let j = 0;
  let acc = 0;

  const emit = (type: string, note: string, caption: string, s: Partial<SparseState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        pairs1: [...pairs1],
        pairs2: [...pairs2],
        i,
        j,
        acc,
        op: '',
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${pairs1.length}+${pairs2.length} pairs`,
    `Sparse Vector Dot Product: store (index,value) pairs. Merge-walk both sorted lists — multiply when indices match.`,
    {},
  );

  while (i < pairs1.length && j < pairs2.length) {
    const [i1, v1] = pairs1[i];
    const [i2, v2] = pairs2[j];
    if (i1 === i2) {
      const prod = v1 * v2;
      acc += prod;
      emit(
        'MATCH',
        `idx ${i1}: ${v1}×${v2}`,
        `Index ${i1} in both: ${v1}×${v2}=${prod}. Running sum → ${acc}.`,
        { op: `match @${i1}`, i, j, acc },
        'good',
      );
      i++;
      j++;
    } else if (i1 < i2) {
      emit('SKIP', `skip v1 @${i1}`, `Index ${i1} only in vec1 — advance i.`, { op: `skip v1 @${i1}`, i, j });
      i++;
    } else {
      emit('SKIP', `skip v2 @${i2}`, `Index ${i2} only in vec2 — advance j.`, { op: `skip v2 @${i2}`, i, j });
      j++;
    }
  }

  emit(
    'DONE',
    `dot=${acc}`,
    `Dot product = ${acc}. Only overlapping indices contributed.`,
    { op: 'done', result: acc, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SparseState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">dot = {s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>vec1 pairs (i→v)</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.pairs1.map(([idx, v], k) => (
          <span
            key={k}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              k === s.i ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {idx}:{v}
          </span>
        ))}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>vec2 pairs</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.pairs2.map(([idx, v], k) => (
          <span
            key={k}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              k === s.j ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {idx}:{v}
          </span>
        ))}
      </div>
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>acc = {s.acc}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SparseState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state as SparseState;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i} />
      <InspectorRow k="j" v={s.j} />
      <InspectorRow k="acc" v={s.acc} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-dot-product-of-two-sparse-vectors';
export const title = 'Dot Product of Two Sparse Vectors';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sp1',
      label: '[1,0,0,2,3] · [0,3,0,4,0]',
      value: { nums1: [1, 0, 0, 2, 3], nums2: [0, 3, 0, 4, 0] },
    },
  ] satisfies SampleInput<SparseInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SparseState | undefined;
    return s?.done ? { ok: true, label: `dot=${s.result}` } : { ok: false, label: 'incomplete' };
  },
};
