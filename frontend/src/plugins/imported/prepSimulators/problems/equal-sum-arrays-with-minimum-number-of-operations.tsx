import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayBars, type BarTone } from '../../../../components/board/ArrayBars';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface EqualSumInput {
  nums1: number[];
  nums2: number[];
}

interface EqualSumState {
  // contrib[c]! = how many dice can change the smaller-sum side toward the
  // larger side by exactly `c` (for c in 1..5). Index 0 is unused.
  contrib: number[];
  c: number | null; // contribution bucket currently being processed (5..1)
  diff: number; // remaining gap to close
  ops: number; // operations used so far
  taken: number; // how many were taken from the current bucket this step
  sum1: number;
  sum2: number;
  result: number | null; // final answer, or null while running
  failed: boolean; // diff could not be closed (impossible)
  done: boolean;
}

const FULL = 6; // a six-sided die: values 1..6

function record({ nums1, nums2 }: EqualSumInput): Frame<EqualSumState>[] {
  // contrib is always shown as 6 buckets (indices 0..5); slot c holds dice that
  // can shift the gap by exactly c. We snapshot a copy in every frame.
  const buildContrib = (smaller: number[], larger: number[]): number[] => {
    const c = new Array<number>(FULL).fill(0);
    // Each die in the SMALLER-sum array can grow by up to (6 - x).
    for (const x of smaller) c[FULL - x]!++;
    // Each die in the LARGER-sum array can shrink by up to (x - 1).
    for (const x of larger) c[x - 1]!++;
    return c;
  };

  const sumOf = (a: number[]) => a.reduce((t, x) => t + x, 0);

  const { emit, frames } = createPrepRecorder<EqualSumState>(() => ({
    contrib: new Array<number>(FULL).fill(0),
    c: null,
    diff: 0,
    ops: 0,
    taken: 0,
    sum1: sumOf(nums1),
    sum2: sumOf(nums2),
    result: null,
    failed: false,
    done: false,
  }));

  // Base state used before contributions are computed.
  let st: EqualSumState = {
    contrib: new Array<number>(FULL).fill(0),
    c: null,
    diff: 0,
    ops: 0,
    taken: 0,
    sum1: sumOf(nums1),
    sum2: sumOf(nums2),
    result: null,
    failed: false,
    done: false,
  };

  // Feasibility guard: each die ranges 1..6, so one array can never reach the
  // other's sum if it is more than 6x longer (all 1s vs all 6s extreme).
  emit(
    'INIT',
    `sum1=${st.sum1} sum2=${st.sum2}`,
    `Each value is a die in 1..6. We want sum(nums1) = sum(nums2) using the fewest single-die changes. Start sums: nums1=${st.sum1}, nums2=${st.sum2}.`,
    st,
  );
  emit(
    'SETUP',
    `len ${nums1.length} vs ${nums2.length}`,
    `Compare array lengths before tallying contributions: nums1 has ${nums1.length} dice, nums2 has ${nums2.length}.`,
    st,
  );
  if (nums1.length > nums2.length * FULL || nums2.length > nums1.length * FULL) {
    emit(
      'IMPOSSIBLE',
      'length gap too big',
      `One array has more than 6x the dice of the other (${nums1.length} vs ${nums2.length}). Even all 6s against all 1s cannot equalize the sums, so the answer is -1.`,
      { ...st, result: -1, failed: true, done: true },
      'bad',
    );
    return frames;
  }

  // Make nums1 the smaller-sum side so every useful move closes the gap.
  let smaller = nums1;
  let larger = nums2;
  let small = st.sum1;
  let large = st.sum2;
  if (small > large) {
    [smaller, larger] = [larger, smaller];
    [small, large] = [large, small];
    emit(
      'SWAP',
      'smaller side first',
      `sum is larger on nums1, so treat the smaller-sum array as the one we raise and the larger-sum array as the one we lower. Smaller sum=${small}, larger sum=${large}.`,
      st,
    );
  }

  const diff = large - small;
  st = { ...st, diff };
  emit(
    'DIFF',
    `diff=${diff}`,
    `The gap to close is diff = ${large} − ${small} = ${diff}. Every operation can shrink this gap by between 1 and 5.`,
    st,
  );

  if (diff === 0) {
    emit(
      'DONE',
      '0 ops',
      `The sums are already equal (diff = 0), so zero operations are needed.`,
      { ...st, result: 0, done: true },
      'good',
    );
    return frames;
  }

  // Bucket every die by how much it can move the gap. This is a counting sort by
  // contribution value — no comparisons, just tallies into 5 slots.
  const contrib = buildContrib(smaller, larger);
  st = { ...st, contrib };
  emit(
    'BUCKET',
    'count contributions',
    `Counting sort by contribution: a smaller-side die x can rise by 6−x; a larger-side die x can drop by x−1. Tally each die into bucket 1..5. Bucket c now holds how many moves shrink the gap by exactly c.`,
    st,
  );

  // Greedy: spend the biggest contributions first to use the fewest operations.
  let ops = 0;
  let rem = diff;
  for (let c = 5; c >= 1 && rem > 0; c--) {
    const available = contrib[c]!;
    if (available === 0) {
      emit(
        'SKIP',
        `bucket ${c} empty`,
        `Bucket ${c} is empty — no die can move the gap by ${c}. Drop to the next-smaller contribution.`,
        { ...st, c, taken: 0, ops, diff: rem },
      );
      continue;
    }
    // We only need ceil(rem / c) moves of size c; never take more than that.
    const need = Math.ceil(rem / c);
    const take = Math.min(available!, need);
    ops += take;
    rem -= take * c;
    if (rem < 0) rem = 0;
    st = { ...st, contrib, c, taken: take, ops, diff: rem };
    emit(
      'TAKE',
      `take ${take}×${c}`,
      `Bucket ${c} has ${available} move(s); we need at most ⌈gap/${c}⌉ = ${need}, so take ${take}. Each closes ${c}, so the gap drops by ${take * c} to ${rem}. Total ops = ${ops}.`,
      st,
      'good',
    );
    if (rem === 0) break;
  }

  if (rem > 0) {
    emit(
      'FAIL',
      'gap not closed',
      `All buckets are exhausted but the gap is still ${rem}. The sums cannot be equalized, so the answer is -1.`,
      { ...st, result: -1, failed: true, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'DONE',
    `${ops} ops`,
    `The gap is fully closed using the largest contributions first. Minimum operations = ${ops}.`,
    { ...st, c: null, taken: 0, result: ops, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<EqualSumState>) {
  const s = frame.state;
  const values = [s.contrib[1]!, s.contrib[2]!, s.contrib[3]!, s.contrib[4]!, s.contrib[5]!];
  const tone = (i: number): BarTone => {
    const bucket = i + 1;
    if (s.done && !s.failed) return values[i]! > 0 ? 'done' : 'idle';
    if (s.c === bucket) return s.taken > 0 ? 'swap' : 'compare';
    return 'idle';
  };
  const label = (i: number) => `×${i + 1}`;
  const rail = (
    <>
      <RailGroup label="sums">
        <RailStat k="sum1" v={s.sum1} />
        <RailStat k="sum2" v={s.sum2} />
      </RailGroup>
      <RailGroup label="scan">
        <RailStat k="gap" v={s.diff} tone={s.diff === 0 ? 'good' : 'accent'} />
        <RailStat k="bucket" v={s.c ?? '—'} />
        <RailStat k="taken" v={s.taken} />
        <RailStat k="ops" v={s.ops} />
      </RailGroup>
      {s.result !== null && (
        <RailResult
          label="answer"
          value={s.result === -1 ? 'impossible' : `${s.result} op(s)`}
          tone={s.result === -1 ? 'bad' : 'good'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={140}>
      <ArrayBars
        values={values}
        tone={tone}
        label={label}
        max={Math.max(1, ...values.map((v) => v!))}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<EqualSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="sum1" v={s.sum1} />
      <InspectorRow k="sum2" v={s.sum2} />
      <InspectorRow k="gap (diff)" v={s.diff} />
      <InspectorRow k="bucket c" v={s.c ?? '—'} />
      <InspectorRow k="taken this step" v={s.taken} />
      <InspectorRow k="ops" v={s.ops} />
      <InspectorRow k="result" v={s.result !== null ? (s.result === -1 ? '-1' : s.result) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-equal-sum-arrays-with-minimum-number-of-operations';
export const title = 'Equal Sum Arrays with Minimum Number of Operations';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Equal Sum Arrays with Minimum Number of Operations"?',
    choices: [
      {
        label: 'Greedy Contribution Counting — fits this problem',
        correct: true,
      },
      {
        label: 'Bucket Sort — different approach',
      },
      {
        label: 'Sort Frequencies + Greedy — different approach',
      },
      {
        label: 'Sort (attack desc, defense asc) + Max — different approach',
      },
    ],
    explain: 'If `min_possible_sum > max_possible_sum` of the other → `-1`',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Equal Sum Arrays with Minimum Number of Operations), what strategy is established?',
    choices: [
      {
        label: 'If `min_possible_sum > max_possible_sum` — described in INIT caption',
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
      'Each value is a die in 1..6. We want sum(nums1) = sum(nums2) using the fewest single-die changes. Start sums: nums1=, nums2=.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step (bucket  empty), what happens?',
    choices: [
      {
        label: 'Bucket is empty — no die — this move caption',
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
    explain:
      'Bucket  is empty — no die can move the gap by . Drop to the next-smaller contribution.',
  },
  {
    id: 'state',
    prompt: 'What does the `c` field track in the visualization state?',
    choices: [
      {
        label: 'contribution bucket currently — updated each frame',
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
    explain: 'The recorder keeps `c` in sync: contribution bucket currently being processed (5..1)',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Equal Sum Arrays with Minimum Number of Operations"?',
    choices: [
      {
        label: 'O(n+m) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·log n·C) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n+m). O(1). If `min_possible_sum > max_possible_sum` of the other → `-1`; Make `nums1` the smaller sum. For each element: max contribution = `6-x` (increase) or `x-1` (decr',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The gap is fully closed using — final DONE caption',
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
    explain:
      'The gap is fully closed using the largest contributions first. Minimum operations = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'es1',
      label: '[1,2,3,4,5,6] vs [1,1,2,2,2,2]',
      value: { nums1: [1, 2, 3, 4, 5, 6], nums2: [1, 1, 2, 2, 2, 2] },
    },
    {
      id: 'es2',
      label: '[1,1,1,1,1,1,1] vs [6]',
      value: { nums1: [1, 1, 1, 1, 1, 1, 1], nums2: [6] },
    },
  ] satisfies SampleInput<EqualSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as EqualSumState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no result' };
    if (s.result === -1) return { ok: true, label: '-1 (impossible)' };
    return { ok: true, label: `${s.result} op(s)` };
  },
};
