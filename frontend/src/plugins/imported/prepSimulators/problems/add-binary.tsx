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

interface AddBinaryInput {
  a: string;
  b: string;
}

interface AddBinaryState {
  a: string;
  b: string;
  i: number | null; // current index into a (-1 = past the front)
  j: number | null; // current index into b (-1 = past the front)
  carry: number; // carry bit going into this column
  sum: number | null; // carry + a[i]! + b[j]! for the current column
  bit: number | null; // sum % 2, the digit we emit for this column
  result: string; // bits produced so far, already in final (left-to-right) order
  done: boolean;
}

const digitAt = (s: string, idx: number): number =>
  idx >= 0 && idx < s.length ? s.charCodeAt(idx) - 48 : 0;

function record({ a, b }: AddBinaryInput): Frame<AddBinaryState>[] {
  const out: string[] = [];

  const { emit, frames } = createPrepRecorder<AddBinaryState>(() => ({
    a,
    b,
    i: null,
    j: null,
    carry: 0,
    sum: null,
    bit: null,
    result: out.slice().reverse().join(''),
    done: false,
  }));

  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;

  emit(
    'INIT',
    `${a} + ${b}`,
    `Add binary: add the two binary strings "${a}" and "${b}" like grade-school addition, but in base 2. Walk both from the rightmost bit, keeping a carry.`,
    { i, j, carry },
  );

  while (i >= 0 || j >= 0 || carry > 0) {
    const av = digitAt(a, i);
    const bv = digitAt(b, j);
    const sum = carry + av + bv;
    const bit = sum % 2;
    const nextCarry = Math.floor(sum / 2);

    const aLabel = i >= 0 ? `a[${i}]!=${av}` : 'a exhausted → 0';
    const bLabel = j >= 0 ? `b[${j}]!=${bv}` : 'b exhausted → 0';
    emit(
      'ADD',
      `sum ${carry}+${av}+${bv}=${sum}`,
      `Column with carry ${carry}: ${aLabel}, ${bLabel}. sum = ${carry} + ${av} + ${bv} = ${sum}. The emitted bit is sum % 2 = ${bit}, and the new carry is sum / 2 = ${nextCarry}.`,
      { i, j, carry, sum, bit },
    );

    out.push(String(bit));
    carry = nextCarry;
    if (i >= 0) i--;
    if (j >= 0) j--;

    emit(
      'EMIT',
      `bit ${bit}, carry ${carry}`,
      `Prepend bit ${bit} to the answer, giving "${out.slice().reverse().join('')}". Carry ${carry} moves into the next column to the left.`,
      { i, j, carry },
    );
  }

  const answer = out.slice().reverse().join('');
  emit(
    'DONE',
    `= ${answer}`,
    `No bits and no carry remain. Reversing the LSB-first bits gives the sum "${answer}".`,
    { i: -1, j: -1, carry: 0, done: true },
    'good',
  );

  return frames;
}

function operandPointer(idx: number | null, label: string): ArrayPointer[] {
  return idx !== null && idx >= 0 ? [{ i: idx, label, tone: 'accent', place: 'above' }] : [];
}

function View({ frame }: PluginViewProps<AddBinaryState>) {
  const s = frame.state;
  const aDigits = s.a.split('');
  const bDigits = s.b.split('');
  const aTone = (idx: number) => (s.i === idx ? 'match' : '');
  const bTone = (idx: number) => (s.j === idx ? 'match' : '');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        adding{' '}
        <span className="font-mono text-ink">
          {s.a} + {s.b}
        </span>{' '}
        in base 2
      </div>
      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>a</div>
      <ArrayRow
        values={aDigits}
        cellTone={aTone}
        pointers={operandPointer(s.i, 'i')}
        windowRange={null}
      />
      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>b</div>
      <ArrayRow
        values={bDigits}
        cellTone={bTone}
        pointers={operandPointer(s.j, 'j')}
        windowRange={null}
      />
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        carry = <span className="text-ink">{s.carry}</span>
        {s.sum !== null && (
          <>
            {' · '}sum = <span className="text-ink">{s.sum}</span>
            {' · '}bit = <span className="text-ink">{s.bit}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
        {s.done ? '→ ' : 'result = '}
        {s.result || '·'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AddBinaryState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="a" v={s.a} />
      <InspectorRow k="b" v={s.b} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="carry" v={s.carry} />
      <InspectorRow k="sum" v={s.sum ?? '—'} />
      <InspectorRow k="bit" v={s.bit ?? '—'} />
      <InspectorRow k="result" v={s.result || (s.done ? '0' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-add-binary';
export const title = 'Add binary';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Add binary"?',
    choices: [
      {
        label: 'Binary string addition — fits this problem',
        correct: true,
      },
      {
        label: 'Bit trick power of two — different approach',
      },
      {
        label: 'Iterative factorial — different approach',
      },
      {
        label: 'Sort + Sliding Window (atan2) — different approach',
      },
    ],
    explain: 'Add right-to-left with a carry bit (base 2)',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Add binary), what strategy is established?',
    choices: [
      {
        label: 'Add right-to-left with a carry bit — described in INIT caption',
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
      'Add binary: add the two binary strings "" and "" like grade-school addition, but in base 2. Walk both from the rightmost bit, keeping a carry.',
  },
  {
    id: 'key-step',
    prompt: 'On the "EMIT" step (bit , carry ), what happens?',
    choices: [
      {
        label: 'Prepend bit to the answer, giving — this move caption',
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
      'Prepend bit  to the answer, giving "". Carry  moves into the next column to the left.',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index into a (-1 — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index into a (-1 = past the front)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Add binary"?',
    choices: [
      {
        label: 'O(max(len)) time, O(max(len)) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(sqrt(n)) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(max(len)). O(max(len)). sum=a+b+carry; bit=sum%2; carry=sum/2; reverse',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'No bits and no carry remain. — final DONE caption',
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
    explain: 'No bits and no carry remain. Reversing the LSB-first bits gives the sum "".',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ab1', label: '"11" + "1"', value: { a: '11', b: '1' } },
    { id: 'ab2', label: '"1010" + "1011"', value: { a: '1010', b: '1011' } },
  ] satisfies SampleInput<AddBinaryInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AddBinaryState | undefined;
    const label = s?.result && s.result.length > 0 ? s.result : '0';
    return { ok: true, label };
  },
};
