import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface RotateInput {
  nums: number[];
  k: number;
}

type Phase = 'init' | 'whole' | 'first' | 'rest' | 'done';

interface RotateState {
  nums: number[]; // current array contents (mutated as we reverse)
  k: number; // effective rotation (after k %= n)
  rawK: number; // the k that was passed in, before %= n
  phase: Phase;
  seg: [number, number] | null; // inclusive [lo, hi] segment being reversed
  l: number | null; // left pointer of the current swap
  r: number | null; // right pointer of the current swap
  done: boolean;
}

function record({ nums: input, k: rawK }: RotateInput): Frame<RotateState>[] {
  const nums = input.slice();
  const n = nums.length;
  const { emit, frames } = createPrepRecorder<RotateState>(() => ({
    nums: nums.slice(),
    k: rawK % (n || 1),
    rawK: rawK,
    phase: 'init',
    seg: null,
    l: null,
    r: null,
    done: false,
  }));

  if (n === 0) {
    emit(
      'DONE',
      'empty',
      'The array is empty, so there is nothing to rotate.',
      { phase: 'done', seg: null, l: null, r: null, done: true },
      'good',
    );
    return frames;
  }

  const k = ((rawK % n) + n) % n;

  emit(
    'INIT',
    `k=${rawK} → ${k}`,
    `Rotate right by ${rawK}. Since rotating by n returns the array to itself, only k % n = ${rawK} % ${n} = ${k} matters. We rotate in place with three reversals: reverse the whole array, then reverse the first k, then reverse the rest.`,
    { phase: 'init', seg: null, l: null, r: null },
  );

  const reverse = (lo: number, hi: number, phase: Phase, segLabel: string) => {
    emit(
      'SEG',
      `${segLabel} [${lo}..${hi}]`,
      `${segLabel}: reverse the segment from index ${lo} to ${hi} by swapping the ends and walking inward.`,
      { phase: phase, seg: lo <= hi ? [lo, hi] : null, l: null, r: null },
    );
    let l = lo;
    let r = hi;
    while (l < r) {
      const a = nums[l]!;
      const b = nums[r]!;
      nums[l]! = b;
      nums[r]! = a;
      emit(
        'SWAP',
        `swap ${l}↔${r}`,
        `Swap nums[${l}]! and nums[${r}]!: ${a} and ${b} trade places, then move the left pointer right and the right pointer left.`,
        { phase: phase, seg: [lo, hi], l: l, r: r },
      );
      l++;
      r--;
    }
    if (lo >= hi) {
      emit(
        'SKIP',
        `${segLabel} trivial`,
        `${segLabel} covers ${lo > hi ? 'no' : 'a single'} element, so there is nothing to swap — it is already reversed.`,
        { phase: phase, seg: lo <= hi ? [lo, hi] : null, l: null, r: null },
      );
    }
  };

  reverse(0, n - 1, 'whole', 'Step 1');
  reverse(0, k - 1, 'first', 'Step 2');
  reverse(k, n - 1, 'rest', 'Step 3');

  emit(
    'DONE',
    `rotated by ${k}`,
    `All three reversals are complete. The array is now rotated right by ${k}: [${nums.join(', ')}].`,
    { phase: 'done', seg: null, l: null, r: null, done: true },
    'good',
  );
  return frames;
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'init':
      return 'setup';
    case 'whole':
      return 'reverse whole';
    case 'first':
      return 'reverse first k';
    case 'rest':
      return 'reverse rest';
    case 'done':
      return 'done';
  }
}

function View({ frame }: PluginViewProps<RotateState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'above' });
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.l === i || s.r === i) return 'match';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="rotation">
        <RailStat k="raw k" v={s.rawK} />
        <RailStat k="eff k" v={s.k} tone="accent" />
        <RailStat k="phase" v={phaseLabel(s.phase)} />
      </RailGroup>
      <RailGroup label="pointers">
        <RailStat k="seg" v={s.seg ? `${s.seg[0]!}..${s.seg[1]!}` : '—'} />
        <RailStat k="l" v={s.l ?? '—'} tone={s.l !== null ? 'accent' : undefined} />
        <RailStat k="r" v={s.r ?? '—'} tone={s.r !== null ? 'warn' : undefined} />
      </RailGroup>
      {s.done && <RailResult label="result" value={`[${s.nums.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={s.seg} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RotateState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="raw k" v={s.rawK} />
      <InspectorRow k="effective k" v={s.k} />
      <InspectorRow k="n" v={s.nums.length} />
      <InspectorRow k="phase" v={phaseLabel(s.phase)} />
      <InspectorRow k="segment" v={s.seg ? `[${s.seg[0]!}..${s.seg[1]!}]` : '—'} />
      <InspectorRow k="l, r" v={s.l !== null && s.r !== null ? `${s.l}, ${s.r}` : '—'} />
      <InspectorRow k="array" v={`[${s.nums.join(',')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-rotate-array';
export const title = 'Rotate array';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Rotate array"?',
    choices: [
      {
        label: 'Reverse segments — fits this problem',
        correct: true,
      },
      {
        label: 'XOR + math — different approach',
      },
      {
        label: 'Heap + math — different approach',
      },
      {
        label: 'Track min/max product — different approach',
      },
    ],
    explain: 'Reverse the whole array, then un-reverse the two pieces',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Rotate array), what strategy is established?',
    choices: [
      {
        label: 'Reverse the whole array, then un-reverse — described in INIT caption',
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
      'Rotate right by . Since rotating by n returns the array to itself, only k % n =  %  =  matters. We rotate in place with three reversals: reverse the whole array, then reverse the first k, then reverse the rest.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SWAP" step (swap ↔), what happens?',
    choices: [
      {
        label: 'Swap nums[] and nums[]: and trade — this move caption',
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
      'Swap nums[] and nums[]:  and  trade places, then move the left pointer right and the right pointer left.',
  },
  {
    id: 'state',
    prompt: 'What does the `nums` field track in the visualization state?',
    choices: [
      {
        label: 'current array contents (mutated — updated each frame',
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
    explain: 'The recorder keeps `nums` in sync: current array contents (mutated as we reverse)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Rotate array"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). k%=n; reverse(0,n-1); reverse(0,k-1); reverse(k,n-1)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All three reversals are complete. — final DONE caption',
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
    explain: 'All three reversals are complete. The array is now rotated right by : [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ra1', label: '[1,2,3,4,5,6,7] k=3', value: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 } },
    { id: 'ra2', label: '[-1,-100,3,99] k=2', value: { nums: [-1, -100, 3, 99], k: 2 } },
  ] satisfies SampleInput<RotateInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RotateState | undefined;
    return s ? { ok: true, label: `[${s.nums.join(',')}]` } : { ok: false, label: 'no result' };
  },
};
