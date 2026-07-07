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

interface MissingInput {
  nums: number[];
}

interface MissingState {
  nums: number[];
  n: number;
  i: number | null; // current index being folded in
  xorAll: number; // running accumulator
  prev: number; // accumulator before this step (for the caption/inspector)
  contrib: number | null; // i ^ v folded in this step
  result: number | null;
  done: boolean;
}

function record({ nums }: MissingInput): Frame<MissingState>[] {
  const n = nums.length;
  let xorAll = n;

  const { emit, frames } = createPrepRecorder<MissingState>(() => ({
    nums,
    n,
    i: null,
    xorAll,
    prev: xorAll,
    contrib: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `xorAll=${n}`,
    `Find Missing Number: the array holds n distinct values from 0..n with exactly one gap. XOR is self-cancelling (x ^ x = 0), so if we XOR every index 0..n together with every value, each present number pairs off and vanishes — leaving only the missing one. Seed the accumulator with n = ${n} (the one index that has no cell). Time O(n), Space O(1).`,
    { xorAll },
  );

  for (let i = 0; i < n; i++) {
    const v = nums[i]!;
    const contrib = i ^ v!;
    const prev = xorAll;
    xorAll ^= i ^ v!;
    emit(
      'FOLD',
      `^= ${i}^${v}`,
      `Index ${i} holds value ${v}. Fold both in: xorAll ^= ${i} ^ ${v} (= ${contrib}). ${prev} ^ ${contrib} = ${xorAll}. Every number that IS present will get XORed an even number of times overall and cancel to 0.`,
      { i, xorAll, prev, contrib },
    );
  }

  emit(
    'DONE',
    `missing ${xorAll}`,
    `All indices and values are folded in. Everything cancelled except the number that never appeared as a value — the accumulator is ${xorAll}, so the missing number is ${xorAll}.`,
    { xorAll, prev: xorAll, result: xorAll, done: true, i: null },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MissingState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · values 0..{s.n} with one gap
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.base, 'text-ink')}>
        xorAll = <span className="text-accent">{s.xorAll}</span>
      </div>
      {s.i !== null && s.contrib !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          {s.prev} ^ ({s.i} ^ {s.nums[s.i]!} = {s.contrib}) = {s.xorAll}
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ missing = {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MissingState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (len)" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]!" v={s.i !== null ? s.nums[s.i]! : '—'} />
      <InspectorRow k="i ^ v" v={s.contrib ?? '—'} />
      <InspectorRow k="xorAll" v={s.xorAll} />
      <InspectorRow k="missing" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-find-missing-number';
export const title = 'Find missing number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find missing number"?',
    choices: [
      {
        label: 'Gauss sum XOR trick — fits this problem',
        correct: true,
      },
      {
        label: 'Integer log base 2 — different approach',
      },
      {
        label: 'Rejection sampling / gap random — different approach',
      },
      {
        label: 'FizzBuzz conditional — different approach',
      },
    ],
    explain: 'XOR all indices and values with n; everything cancels but the gap',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find missing number), what strategy is established?',
    choices: [
      {
        label: 'XOR all indices and values — described in INIT caption',
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
      'Find Missing Number: the array holds n distinct values from 0..n with exactly one gap. XOR is self-cancelling (x ^ x = 0), so if we XOR every index 0..n together with every value, each present number pairs off and vanishes — leaving only the missing one. Seed the accumulator with n =  (the one index that has no cell). Time O(n), Space O(1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "FOLD" step (^= ^), what happens?',
    choices: [
      {
        label: 'Index holds value . Fold both — this move caption',
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
      'Index  holds value . Fold both in: xorAll ^=  ^  (= ).  ^  = . Every number that IS present will get XORed an even number of times overall and cancel to 0.',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index being folded — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index being folded in',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find missing number"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log exp) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). xorAll=n; xorAll ^= i ^ v for each',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All indices and values are folded — final DONE caption',
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
      'All indices and values are folded in. Everything cancelled except the number that never appeared as a value — the accumulator is , so the missing number is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'fmn1', label: '[3,0,1] → 2', value: { nums: [3, 0, 1] } },
    { id: 'fmn2', label: '[0,1,3,4] → 2', value: { nums: [0, 1, 3, 4] } },
  ] satisfies SampleInput<MissingInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MissingState | undefined;
    return s && s.result !== null
      ? { ok: true, label: `missing = ${s.result}` }
      : { ok: false, label: 'no result' };
  },
};
