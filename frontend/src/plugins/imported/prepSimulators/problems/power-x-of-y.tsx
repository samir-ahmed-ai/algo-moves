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

interface PowerInput {
  base: number;
  exp: number;
}

interface PowerState {
  origBase: number;
  origExp: number;
  bits: string[]; // exponent in binary, most-significant bit first
  i: number | null; // index into bits of the bit currently processed
  base: number; // running squared base
  result: number; // accumulated product
  odd: boolean | null; // was the current low bit set?
  multiplied: boolean; // did we fold base into result this step?
  done: boolean;
}

// exp as MSB-first bit string, e.g. 13 -> "1101"
function toBits(exp: number): string[] {
  if (exp === 0) return ['0'];
  const out: string[] = [];
  let e = exp;
  while (e > 0) {
    out.push((e & 1).toString());
    e >>= 1;
  }
  return out.reverse();
}

function record({ base, exp }: PowerInput): Frame<PowerState>[] {
  const bits = toBits(Math.max(exp, 0));

  const { emit, frames } = createRecorder<PowerState>(() => ({
    origBase: base,
    origExp: exp,
    bits,
    i: null,
    base,
    result: 1,
    odd: null,
    multiplied: false,
    done: false,
  }));

  if (exp < 0) {
    emit(
      'GUARD',
      'exp<0 → 0',
      `The exponent ${exp} is negative, and this integer routine only handles exp ≥ 0, so it returns 0 immediately.`,
      { result: 0, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'INIT',
    `${base}^${exp}`,
    `Compute ${base}^${exp} by binary exponentiation. Read the exponent's bits from low to high: square the base every step, and multiply it into the result only when the current low bit is 1. Time O(log exp), space O(1).`,
    { i: null, base, result: 1 },
  );

  let result = 1;
  let curBase = base;
  let e = exp;
  // idx walks the bit string from the LEAST-significant end (rightmost) to match exp>>=1.
  let idx = bits.length - 1;

  while (e > 0) {
    const odd = (e & 1) === 1;
    if (odd) {
      result *= curBase;
      emit(
        'MULT',
        `res*=${curBase}`,
        `Bit ${bits[idx]} at this position is 1, so this power of the base counts: result *= base → result = ${result} (base is ${curBase} = ${base}^${1 << (bits.length - 1 - idx)}).`,
        { i: idx, base: curBase, result, odd: true, multiplied: true },
        'good',
      );
    } else {
      emit(
        'SKIP',
        `bit 0`,
        `Bit ${bits[idx]} at this position is 0, so this power of the base is skipped — result stays ${result}.`,
        { i: idx, base: curBase, result, odd: false, multiplied: false },
      );
    }

    const squared = curBase * curBase;
    emit(
      'SQUARE',
      `base=${squared}`,
      `Square the base for the next higher bit: base = ${curBase} × ${curBase} = ${squared}, then shift the exponent right (exp >>= 1) to look at the next bit.`,
      { i: idx, base: squared, result, odd },
    );
    curBase = squared;
    e >>= 1;
    idx -= 1;
  }

  emit(
    'DONE',
    `= ${result}`,
    `Every bit of the exponent has been consumed. The accumulated product is ${result}, so ${base}^${exp} = ${result}.`,
    { i: null, base: curBase, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PowerState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'bit', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.i === i) return s.odd ? 'match' : 'mid';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        computing{' '}
        <span className="font-mono text-ink">
          {s.origBase}^{s.origExp}
        </span>{' '}
        · exponent in binary (low bit = rightmost)
      </div>
      <ArrayRow values={s.bits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        base = <span className="text-ink">{s.base}</span>
        {'  ·  '}result = <span className="text-ink">{s.result}</span>
        {s.odd !== null && !s.done && (
          <>
            {'  ·  '}
            <span className={s.odd ? 'text-good' : 'text-ink3'}>
              {s.odd ? 'bit 1 → multiply' : 'bit 0 → skip'}
            </span>
          </>
        )}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.origBase}^{s.origExp} = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PowerState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="base^exp" v={`${s.origBase}^${s.origExp}`} />
      <InspectorRow k="bits (MSB→LSB)" v={s.bits.join('')} />
      <InspectorRow k="current bit" v={s.i !== null ? s.bits[s.i] : '—'} />
      <InspectorRow k="base (squared)" v={s.base} />
      <InspectorRow k="result" v={s.result} />
      <InspectorRow k="answer" v={s.done ? s.result : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-power-x-of-y';
export const title = 'Power X of Y';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Power X of Y"?',
    choices: [
      {
        label: 'Binary exponentiation — fits this problem',
        correct: true,
      },
      {
        label: 'Primality trial division — different approach',
      },
      {
        label: 'Fibonacci iterative — different approach',
      },
      {
        label: 'Greedy — different approach',
      },
    ],
    explain: 'Square the base each step; multiply in when the exponent bit is 1',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Power X of Y), what strategy is established?',
    choices: [
      {
        label: 'Square the base each step; multiply — described in INIT caption',
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
      "Compute ^ by binary exponentiation. Read the exponent's bits from low to high: square the base every step, and multiply it into the result only when the current low bit is 1. Time O(log exp), space O(1).",
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step (bit 0), what happens?',
    choices: [
      {
        label: 'Bit at this position is 0 — this move caption',
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
    explain: 'Bit  at this position is 0, so this power of the base is skipped — result stays .',
  },
  {
    id: 'state',
    prompt: 'What does the `bits` field track in the visualization state?',
    choices: [
      {
        label: 'exponent in binary, most-significant bit — updated each frame',
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
    explain: 'The recorder keeps `bits` in sync: exponent in binary, most-significant bit first',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Power X of Y"?',
    choices: [
      {
        label: 'O(log exp) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(reservations) time, O(reserved rows) — wrong order of growth',
      },
      {
        label: 'O(log x) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(log exp). O(1). exp odd -> res*=base; base*=base; exp>>=1',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every bit of the exponent — final DONE caption',
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
    explain: 'Every bit of the exponent has been consumed. The accumulated product is , so ^ = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'pw1', label: '2 ^ 10', value: { base: 2, exp: 10 } },
    { id: 'pw2', label: '3 ^ 5', value: { base: 3, exp: 5 } },
  ] satisfies SampleInput<PowerInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PowerState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `= ${s.result}` };
  },
};
