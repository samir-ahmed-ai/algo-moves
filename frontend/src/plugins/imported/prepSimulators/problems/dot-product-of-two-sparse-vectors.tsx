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
    prompt: 'Which approach fits "Dot Product of Two Sparse Vectors"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Bijective tiny URL encode/decode — different approach',
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
    ],
    explain: 'See Dot Product Of Two Sparse Vectors pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Dot Product of Two Sparse Vectors), what strategy is established?',
    choices: [
      {
        label: 'See Dot Product Of Two Sparse — described in INIT caption',
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
    explain:
      'Sparse Vector Dot Product: store (index,value) pairs. Merge-walk both sorted lists — multiply when indices match.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step (skip v1 @), what happens?',
    choices: [
      {
        label: 'Index only in vec1 — advance — this move caption',
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
    explain: 'Index  only in vec1 — advance i.',
  },
  {
    id: 'state',
    prompt: 'What does the `pairs1` field track in the visualization state?',
    choices: [
      {
        label: 'Field pairs1 in state — updated each frame',
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
      'The recorder snapshots `pairs1` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Dot product = . Only overlapping — final DONE caption',
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
    explain: 'Dot product = . Only overlapping indices contributed.',
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
