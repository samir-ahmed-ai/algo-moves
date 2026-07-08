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
  vizText,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

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
  for (let i = 0; i < nums.length; i++) if (nums[i]! !== 0) pairs.push([i, nums[i]!]);
  return pairs;
}

function record({ nums1, nums2 }: SparseInput): Frame<SparseState>[] {
  const pairs1 = toPairs(nums1);
  const pairs2 = toPairs(nums2);
  let i = 0;
  let j = 0;
  let acc = 0;

  const { emit, frames } = createPrepRecorder<SparseState>(() => ({
    pairs1: [...pairs1],
    pairs2: [...pairs2],
    i,
    j,
    acc,
    op: '',
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${pairs1.length}+${pairs2.length} pairs`,
    `Sparse Vector Dot Product: store (index,value) pairs. Merge-walk both sorted lists — multiply when indices match.`,
    {},
  );

  while (i < pairs1.length && j < pairs2.length) {
    const [i1, v1] = pairs1[i]!;
    const [i2, v2] = pairs2[j]!;
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
      emit('SKIP', `skip v1 @${i1}`, `Index ${i1} only in vec1 — advance i.`, {
        op: `skip v1 @${i1}`,
        i,
        j,
      });
      i++;
    } else {
      emit('SKIP', `skip v2 @${i2}`, `Index ${i2} only in vec2 — advance j.`, {
        op: `skip v2 @${i2}`,
        i,
        j,
      });
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
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i} />
        <RailStat k="j" v={s.j} />
        <RailStat k="op" v={s.op || '—'} />
        <RailStat k="acc" v={s.acc} tone="accent" />
      </RailGroup>
      {s.result !== null && <RailResult label="dot" value={s.result} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <div className={cn(vizText.sm, 'text-ink3')}>vec1 pairs (i→v)</div>
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
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How are sparse vectors stored for dot product?',
    choices: [
      {
        label: 'Sorted index-value pairs — only non-zero entries kept',
        correct: true,
      },
      {
        label: 'Dense length-n arrays — scan every index including zeros',
      },
      {
        label: 'Hash map per vector — unsorted random index iteration',
      },
      {
        label: 'RLE count-value runs — flat encoding consumed by Next',
      },
    ],
    explain: 'toPairs filters nonzeros; merge-walk advances i or j comparing index keys.',
  },
  {
    id: 'key-step',
    prompt: 'On MATCH when i1 equals i2, what contributes to the dot product?',
    choices: [
      {
        label: 'Multiply v1 times v2 — add product to running accumulator acc',
        correct: true,
      },
      {
        label: 'Add v1 plus v2 — sum values at shared index only',
      },
      {
        label: 'Skip both pointers — ignore equal indices entirely',
      },
      {
        label: 'Take max of v1 v2 — larger magnitude wins at index',
      },
    ],
    explain: 'Matching indices emit prod = v1*v2, acc += prod, then both i and j advance.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for sparse vector dot product?',
    choices: [
      {
        label: 'O(n1 + n2) time, O(nonzeros) space — merge walk both lists',
        correct: true,
      },
      {
        label: 'O(n1 × n2) time, O(1) space — cross multiply all pairs',
      },
      {
        label: 'O(n log n) time, O(n) space — sort full dense vectors',
      },
      {
        label: 'O(1) time, O(n) space — hash lookup per dense index',
      },
    ],
    explain:
      'Each pointer moves forward at least one step per iteration; storage is pair lists only.',
  },
  {
    id: 'edge',
    prompt: 'When i1 < i2 during the merge walk, what happens?',
    choices: [
      {
        label: 'Advance i pointer — index exists solely in first vector list',
        correct: true,
      },
      {
        label: 'Advance j pointer — treat smaller index as vec2-only skip',
      },
      {
        label: 'Stop walk early — unequal indices end dot product',
      },
      {
        label: 'Insert zero pair — synthesize missing index in vec2',
      },
    ],
    explain: 'SKIP frame advances i when the smaller index appears only in pairs1.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
