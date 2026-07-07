import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SingleNumberInput {
  nums: number[];
}

interface SingleNumberState {
  nums: number[];
  i: number | null; // index of the value being folded in this frame
  prevAcc: number | null; // accumulator before this XOR
  v: number | null; // nums[i]
  acc: number; // running XOR accumulator
  bits: number; // how many bit columns to render
  done: boolean;
  answer: number | null;
}

// Fixed width so the bit board reads the same on every frame.
const BITS = 5;

function toBits(n: number, width: number): string[] {
  const out: string[] = [];
  for (let b = width - 1; b >= 0; b--) out.push(((n >> b) & 1).toString());
  return out;
}

function record({ nums }: SingleNumberInput): Frame<SingleNumberState>[] {
  const { emit, frames } = createRecorder<SingleNumberState>(() => ({
    nums,
    i: null,
    prevAcc: null,
    v: null,
    acc: 0,
    bits: BITS,
    done: false,
    answer: null,
  }));

  let acc = 0;

  emit(
    'INIT',
    'acc=0',
    `Find Single Number: every value appears twice except one. XOR is its own inverse (x ^ x = 0) and order-independent, so folding all values together cancels the pairs and leaves the lonely one. Start with acc = 0.`,
    { acc: 0 },
  );

  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    const prev = acc;
    acc ^= v;
    const canceled = acc === 0;
    emit(
      'XOR',
      `acc^=${v}`,
      `Fold in nums[${i}] = ${v}: acc = ${prev} ^ ${v} = ${acc}. XOR compares bit by bit — matching bits become 0, differing bits become 1.${
        canceled
          ? ` The accumulator dropped back to 0, so ${v} just canceled an earlier equal value.`
          : ''
      }`,
      { i, v, prevAcc: prev, acc },
    );
  }

  emit(
    'DONE',
    `${acc}`,
    `Every duplicate paired off to 0, so what remains is the single number: ${acc}. This ran in O(n) time and O(1) space — one accumulator, one pass.`,
    { acc, done: true, answer: acc },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SingleNumberState>) {
  const s = frame.state;

  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });

  const tone = (i: number) => (s.done ? '' : s.i === i ? 'match' : '');

  const accBits = toBits(s.acc, s.bits);
  const prevBits = s.prevAcc !== null ? toBits(s.prevAcc, s.bits) : null;
  const vBits = s.v !== null ? toBits(s.v, s.bits) : null;

  const bitCell = (val: string, changed: boolean, key: number) => (
    <span
      key={key}
      className={cn(
        'inline-block w-5 text-center font-mono',
        vizText.sm,
        changed ? 'text-accent' : 'text-ink',
      )}
    >
      {val}
    </span>
  );

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        acc = <span className="font-mono text-ink">{s.acc}</span>
        {s.v !== null && !s.done && (
          <>
            {' · '}folding nums[{s.i}] = <span className="font-mono text-ink">{s.v}</span>
          </>
        )}
      </div>

      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />

      <div
        className={cn('mt-2 grid gap-x-3 gap-y-1', vizText.sm)}
        style={{ gridTemplateColumns: 'auto auto' }}
      >
        {prevBits && vBits && (
          <>
            <span className="text-ink3">prev acc</span>
            <span>{prevBits.map((b, k) => bitCell(b, false, k))}</span>
            <span className="text-ink3">^ {s.v}</span>
            <span>{vBits.map((b, k) => bitCell(b, false, k))}</span>
          </>
        )}
        <span className={cn(s.done ? 'text-good' : 'text-ink3')}>{s.done ? 'single' : 'acc'}</span>
        <span>{accBits.map((b, k) => bitCell(b, prevBits !== null && prevBits[k] !== b, k))}</span>
      </div>

      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>
        bits (MSB→LSB); matching bits cancel to 0
      </div>

      {s.answer !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.answer}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SingleNumberState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.v ?? '—'} />
      <InspectorRow k="prev acc" v={s.prevAcc ?? '—'} />
      <InspectorRow k="acc (XOR)" v={s.acc} />
      <InspectorRow k="acc bits" v={toBits(s.acc, s.bits).join('')} />
      <InspectorRow k="answer" v={s.answer ?? (s.done ? '—' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-find-single-number';
export const title = 'Find single number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find single number"?',
    choices: [
      {
        label: 'Singleton XOR — fits this problem',
        correct: true,
      },
      {
        label: 'Base conversion repeated divmod — different approach',
      },
      {
        label: 'Strobogrammatic map — different approach',
      },
      {
        label: 'Primality trial division — different approach',
      },
    ],
    explain: 'Pairs cancel under XOR; the lonely value survives',
  },
  {
    id: 'key-step',
    prompt: 'On the "XOR" step (acc^=), what happens?',
    choices: [
      {
        label: 'Fold in nums[] = : acc — this move caption',
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
      'Fold in nums[] = : acc =  ^  = . XOR compares bit by bit — matching bits become 0, differing bits become 1.${\n        canceled\n          ? ',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'index of the value — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: index of the value being folded in this frame',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find single number"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(m+n) space — wrong order of growth',
      },
      {
        label: 'O(reservations) time, O(reserved rows) — wrong order of growth',
      },
      {
        label: 'O(log x) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). acc=0; acc^=each num; return acc',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every duplicate paired off to 0 — final DONE caption',
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
      'Every duplicate paired off to 0, so what remains is the single number: . This ran in O(n) time and O(1) space — one accumulator, one pass.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sn1', label: '[4,1,2,1,2] → 4', value: { nums: [4, 1, 2, 1, 2] } },
    { id: 'sn2', label: '[7,3,5,3,7] → 5', value: { nums: [7, 3, 5, 3, 7] } },
  ] satisfies SampleInput<SingleNumberInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SingleNumberState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: true, label: `single = ${s.acc}` };
  },
};
