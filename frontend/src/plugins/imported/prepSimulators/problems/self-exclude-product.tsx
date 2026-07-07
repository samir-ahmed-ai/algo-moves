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
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SelfExcludeInput {
  nums: number[];
}

type Phase = 'init' | 'prefix' | 'suffix' | 'done';

interface SelfExcludeState {
  nums: number[];
  out: (number | null)[]; // null = not filled yet (only step 0 is seeded first)
  phase: Phase;
  i: number | null; // index currently being written
  ref: number | null; // index read from (i-1 on prefix pass, i on suffix pass)
  suffix: number | null; // running product of elements to the right (suffix pass only)
  done: boolean;
}

function record({ nums }: SelfExcludeInput): Frame<SelfExcludeState>[] {
  const n = nums.length;
  const out = new Array<number | null>(n).fill(null);
  const { emit, frames } = createPrepRecorder<SelfExcludeState>(() => ({
    nums,
    out: out.slice(),
    phase: 'init',
    i: null,
    ref: null,
    suffix: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Self exclude product: out[i]! should be the product of every element except nums[i]!. We do it in two passes with no division — a left-to-right prefix pass, then a right-to-left suffix pass. Time O(n), space O(1) extra.`,
    { phase: 'init' },
  );

  // Prefix pass: out[i]! = product of all elements left of i.
  out[0]! = 1;
  emit(
    'PREFIX',
    'out[0]!=1',
    `Prefix pass begins. There is nothing to the left of index 0, so its prefix product is the identity 1. out[0]! = 1.`,
    { phase: 'prefix', i: 0 },
  );

  for (let i = 1; i < n; i++) {
    out[i]! = out[i - 1]! * nums[i - 1]!;
    emit(
      'PREFIX',
      `out[${i}]!=${out[i]!}`,
      `Carry the prefix forward: out[${i}]! = out[${i - 1}]! (=${out[i - 1]!}) × nums[${i - 1}]! (=${nums[i - 1]!}) = ${out[i]!}. Now out[${i}]! holds the product of everything to the LEFT of index ${i}.`,
      { phase: 'prefix', i, ref: i - 1 },
    );
  }

  // Suffix pass: multiply out[i]! by the running product of elements right of i.
  let suffix = 1;
  emit(
    'SUFFIX',
    'suffix=1',
    `Suffix pass begins from the right. We keep a single running variable suffix = product of everything seen so far to the RIGHT, starting at the identity 1.`,
    { phase: 'suffix', suffix },
  );

  for (let i = n - 1; i >= 0; i--) {
    const before = out[i]!;
    out[i]! = before * suffix;
    emit(
      'SUFFIX',
      `out[${i}]!=${out[i]!}`,
      `out[${i}]! = prefix(${before}) × suffix(${suffix}) = ${out[i]!}. Multiplying the left product by the right product gives the product of all elements except nums[${i}]!.`,
      { phase: 'suffix', i, suffix },
    );
    suffix *= nums[i]!;
    emit(
      'SUFFIX',
      `suffix=${suffix}`,
      `Fold nums[${i}]! (=${nums[i]!}) into the running suffix so the next (more-left) index sees everything to its right: suffix = ${suffix}.`,
      { phase: 'suffix', i, suffix },
    );
  }

  emit(
    'DONE',
    'complete',
    `Both passes are finished. out now holds the self-exclude product at every index, computed in O(n) time with O(1) extra space.`,
    { phase: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SelfExcludeState>) {
  const s = frame.state;

  const numPointers: ArrayPointer[] = [];
  if (s.ref !== null && s.phase === 'prefix')
    numPointers.push({ i: s.ref, label: 'i−1', tone: 'warn', place: 'above' });
  if (s.i !== null && s.phase === 'prefix')
    numPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.i !== null && s.phase === 'suffix')
    numPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });

  const outPointers: ArrayPointer[] = [];
  if (s.i !== null && (s.phase === 'prefix' || s.phase === 'suffix'))
    outPointers.push({ i: s.i, label: 'out[i]!', tone: 'good', place: 'below' });

  const numTone = (i: number) => (s.i === i ? 'match' : '');
  const outTone = (i: number) =>
    s.done ? 'found' : s.i === i ? 'match' : s.out[i]! !== null ? 'in-window' : '';

  const outCells = s.out.map((v) => (v === null ? '·' : v));

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        pass = <span className="font-mono text-ink">{s.phase}</span>
        {s.suffix !== null && s.phase === 'suffix' && (
          <>
            {' · '}suffix = <span className="font-mono text-ink">{s.suffix}</span>
          </>
        )}
      </div>

      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>nums</div>
      <ArrayRow values={s.nums} cellTone={numTone} pointers={numPointers} windowRange={null} />

      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>out</div>
      <ArrayRow values={outCells} cellTone={outTone} pointers={outPointers} windowRange={null} />

      {s.done && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>
          → [{s.out.map((v) => (v === null ? '·' : v)).join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SelfExcludeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const outAt = (i: number | null) =>
    i !== null && i >= 0 && i < s.out.length ? (s.out[i]! === null ? '·' : s.out[i]!) : '—';
  return (
    <VarGrid>
      <InspectorRow k="pass" v={s.phase} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]!" v={s.i !== null ? s.nums[s.i]! : '—'} />
      <InspectorRow k="out[i]!" v={outAt(s.i)} />
      <InspectorRow k="suffix" v={s.suffix ?? '—'} />
      <InspectorRow k="filled" v={s.out.filter((v) => v !== null).length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-self-exclude-product';
export const title = 'Self exclude product';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Self exclude product"?',
    choices: [
      {
        label: 'Prefix + suffix pass — fits this problem',
        correct: true,
      },
      {
        label: 'Monotonic stack — different approach',
      },
      {
        label: 'Reverse segments — different approach',
      },
      {
        label: 'Greedy reach — different approach',
      },
    ],
    explain: 'Left-product pass fills out[i]!, right-product pass multiplies it',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Self exclude product), what strategy is established?',
    choices: [
      {
        label: 'Left-product pass fills out[i]! — described in INIT caption',
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
      'Self exclude product: out[i]! should be the product of every element except nums[i]!. We do it in two passes with no division — a left-to-right prefix pass, then a right-to-left suffix pass. Time O(n), space O(1) extra.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SUFFIX" step (out[]=), what happens?',
    choices: [
      {
        label: 'out[] = prefix() × suffix() = — this move caption',
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
      'out[] = prefix() × suffix() = . Multiplying the left product by the right product gives the product of all elements except nums[].',
  },
  {
    id: 'state',
    prompt: 'What does the `out` field track in the visualization state?',
    choices: [
      {
        label: 'null = not filled yet — updated each frame',
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
      'The recorder keeps `out` in sync: null = not filled yet (only step 0 is seeded first)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Self exclude product"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n+m) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). out[i]!=prefix products; then *= suffix going right-to-left',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Fold nums[] (=) into the running — final DONE caption',
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
      'Fold nums[] (=) into the running suffix so the next (more-left) index sees everything to its right: suffix = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sep1', label: '[1,2,3,4]', value: { nums: [1, 2, 3, 4] } },
    { id: 'sep2', label: '[2,3,5]', value: { nums: [2, 3, 5] } },
  ] satisfies SampleInput<SelfExcludeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SelfExcludeState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const out = s.out.map((v) => (v === null ? 0 : v));
    return { ok: true, label: `[${out.join(',')}]` };
  },
};
