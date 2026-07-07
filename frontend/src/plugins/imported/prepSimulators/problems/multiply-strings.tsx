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

interface MultiplyInput {
  num1: string;
  num2: string;
}

interface MultiplyState {
  num1: string;
  num2: string;
  pos: number[]; // grade-school accumulator, length m+n
  i: number | null; // index into num1 (multiplicand digit)
  j: number | null; // index into num2 (multiplier digit)
  low: number | null; // i+j+1, where the ones digit lands
  high: number | null; // i+j, where the carry lands
  mul: number | null; // digit product
  sum: number | null; // mul + pos[low]
  result: string | null; // final answer once known
  done: boolean;
}

function record({ num1, num2 }: MultiplyInput): Frame<MultiplyState>[] {
  const m = num1.length;
  const n = num2.length;
  const pos = new Array<number>(m + n).fill(0);

  const { emit, frames } = createRecorder<MultiplyState>(() => ({
    num1,
    num2,
    pos: pos.slice(),
    i: null,
    j: null,
    low: null,
    high: null,
    mul: null,
    sum: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${num1} × ${num2}`,
    `Multiply Strings: compute ${num1} × ${num2} without bignum. Digit i of num1 times digit j of num2 always lands in slots i+j and i+j+1 of a pos array of length m+n = ${m + n}.`,
    {},
  );

  if (num1 === '0' || num2 === '0') {
    emit(
      'ZERO',
      '= 0',
      `One operand is "0", so the product is "0" immediately.`,
      { result: '0', done: true },
      'good',
    );
    return frames;
  }

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const d1 = num1.charCodeAt(i) - 48;
      const d2 = num2.charCodeAt(j) - 48;
      const mul = d1 * d2;
      const low = i + j + 1;
      const high = i + j;
      const sum = mul + pos[low];

      emit(
        'MUL',
        `${d1}×${d2}=${mul}`,
        `Take num1[${i}]=${d1} and num2[${j}]=${d2}. Their product is ${d1}×${d2} = ${mul}. It contributes to slots ${high} (tens) and ${low} (ones) of pos.`,
        { i, j, low, high, mul },
      );

      emit(
        'ADD',
        `sum=${sum}`,
        `Add the product to whatever already sits in the ones slot pos[${low}]=${pos[low]}: sum = ${mul} + ${pos[low]} = ${sum}.`,
        { i, j, low, high, mul, sum },
      );

      pos[low] = sum % 10;
      pos[high] += Math.floor(sum / 10);

      emit(
        'WRITE',
        `pos[${low}]=${sum % 10}`,
        `Keep the ones digit here: pos[${low}] = ${sum} mod 10 = ${sum % 10}, and carry the tens up: pos[${high}] += ${Math.floor(sum / 10)}.`,
        { i, j, low, high, mul, sum },
      );
    }
  }

  let res = '';
  for (const p of pos) {
    if (res.length > 0 || p !== 0) res += String(p);
  }
  if (res.length === 0) res = '0';

  emit(
    'DONE',
    `= ${res}`,
    `Read pos left-to-right, dropping leading zeros: the product ${num1} × ${num2} = ${res}.`,
    { result: res, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MultiplyState>) {
  const s = frame.state;
  const num1Cells = s.num1.split('');
  const num2Cells = s.num2.split('');

  const p1: ArrayPointer[] =
    s.i !== null ? [{ i: s.i, label: 'i', tone: 'accent', place: 'above' }] : [];
  const p2: ArrayPointer[] =
    s.j !== null ? [{ i: s.j, label: 'j', tone: 'warn', place: 'above' }] : [];

  const posPointers: ArrayPointer[] = [];
  if (s.low !== null) posPointers.push({ i: s.low, label: 'ones', tone: 'good', place: 'above' });
  if (s.high !== null && s.high !== s.low)
    posPointers.push({ i: s.high, label: 'tens', tone: 'accent', place: 'below' });

  const posTone = (idx: number) => (s.low === idx ? 'match' : s.high === idx ? 'mid' : '');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        <span className="font-mono text-ink">{s.num1}</span> ×{' '}
        <span className="font-mono text-ink">{s.num2}</span>
        {s.mul !== null && !s.done && (
          <>
            {' · '}mul = <span className="font-mono text-ink">{s.mul}</span>
            {s.sum !== null && (
              <>
                {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
              </>
            )}
          </>
        )}
      </div>
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>num1</div>
      <ArrayRow
        values={num1Cells}
        cellTone={(idx) => (s.i === idx ? 'match' : '')}
        pointers={p1}
        windowRange={null}
      />
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>num2</div>
      <ArrayRow
        values={num2Cells}
        cellTone={(idx) => (s.j === idx ? 'match' : '')}
        pointers={p2}
        windowRange={null}
      />
      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>
        pos (accumulator, len {s.pos.length})
      </div>
      <ArrayRow values={s.pos} cellTone={posTone} pointers={posPointers} windowRange={null} />
      {s.result && <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ {s.result}</div>}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MultiplyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="num1" v={s.num1} />
      <InspectorRow k="num2" v={s.num2} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="mul (di×dj)" v={s.mul ?? '—'} />
      <InspectorRow k="sum (mul+pos)" v={s.sum ?? '—'} />
      <InspectorRow k="ones slot i+j+1" v={s.low ?? '—'} />
      <InspectorRow k="tens slot i+j" v={s.high ?? '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-multiply-strings';
export const title = 'Multiply Strings';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Multiply Strings"?',
    choices: [
      {
        label: 'Grade-school multiplication — fits this problem',
        correct: true,
      },
      {
        label: 'Strobogrammatic map — different approach',
      },
      {
        label: 'Uniform random in range — different approach',
      },
      {
        label: 'Gauss sum XOR trick — different approach',
      },
    ],
    explain: 'See Multiply Strings pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Multiply Strings), what strategy is established?',
    choices: [
      {
        label: 'See Multiply Strings pattern — described in INIT caption',
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
      'Multiply Strings: compute  ×  without bignum. Digit i of num1 times digit j of num2 always lands in slots i+j and i+j+1 of a pos array of length m+n = .',
  },
  {
    id: 'key-step',
    prompt: 'On the "ADD" step (sum=), what happens?',
    choices: [
      {
        label: 'Add the product to whatever already — this move caption',
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
    explain: 'Add the product to whatever already sits in the ones slot pos[]=: sum =  +  = .',
  },
  {
    id: 'state',
    prompt: 'What does the `pos` field track in the visualization state?',
    choices: [
      {
        label: 'grade-school accumulator, length m+n — updated each frame',
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
    explain: 'The recorder keeps `pos` in sync: grade-school accumulator, length m+n',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Multiply Strings"?',
    choices: [
      {
        label: 'O(m·n) time, O(m+n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(d) time, O(d) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m·n). O(m+n). Multiply Strings',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Read pos left-to-right, dropping leading — final DONE caption',
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
    explain: 'Read pos left-to-right, dropping leading zeros: the product  ×  = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ms1', label: '"12" × "34"', value: { num1: '12', num2: '34' } },
    { id: 'ms2', label: '"123" × "45"', value: { num1: '123', num2: '45' } },
  ] satisfies SampleInput<MultiplyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MultiplyState | undefined;
    return s?.result ? { ok: true, label: s.result } : { ok: false, label: 'no result' };
  },
};
