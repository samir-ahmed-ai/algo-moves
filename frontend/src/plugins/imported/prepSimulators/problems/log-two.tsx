import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LogTwoInput {
  n: number;
}

interface LogTwoState {
  original: number; // the starting n (never mutated)
  bits: number[]; // fixed-width binary of `current`, MSB first
  current: number; // the working value after shifts
  count: number; // number of right-shifts performed = floor(log2 original)
  msb: number | null; // index (in bits[]) of the highest set bit, the "survivor"
  done: boolean;
  invalid: boolean; // n <= 0 → answer -1
}

const WIDTH = 6; // bit-width for the board; inputs kept < 2^6 = 64

function toBits(v: number): number[] {
  const out: number[] = [];
  for (let b = WIDTH - 1; b >= 0; b--) out.push((v >> b) & 1);
  return out;
}

// index of the highest set bit in the fixed-width bits[] (MSB first), or null.
function highestSetIndex(bits: number[]): number | null {
  for (let i = 0; i < bits.length; i++) if (bits[i] === 1) return i;
  return null;
}

function record({ n }: LogTwoInput): Frame<LogTwoState>[] {
  const { emit, frames } = createRecorder<LogTwoState>(() => ({
        original: n,
        bits: toBits(Math.max(n, 0)),
        current: n,
        count: 0,
        msb: null,
        done: false,
        invalid: false
      }));

  if (n <= 0) {
    emit(
      'INVALID',
      'n<=0 → -1',
      `Log base 2 is only defined for positive integers, and n = ${n} is not positive, so the function returns -1.`,
      { done: true, invalid: true },
      'bad',
    );
    return frames;
  }

  let current = n;
  let count = 0;
  let bits = toBits(current);

  emit(
    'INIT',
    `n=${n}`,
    `We want floor(log2(${n})): how many times can we halve ${n} (integer division) before we hit 1? Each halving is one right-shift n >>= 1, and we count the shifts. Start with bits = 0.`,
    { current, count, bits, msb: highestSetIndex(bits) },
  );

  while (current > 1) {
    const before = current;
    const shifted = current >> 1;
    emit(
      'SHIFT',
      `${before}>>1=${shifted}`,
      `current = ${before} > 1, so shift right by one: ${before} >> 1 = ${shifted} (drops the lowest bit, i.e. halve and floor). Every bit slides one place toward the least-significant end.`,
      { current: before, count, bits: toBits(before), msb: highestSetIndex(toBits(before)) },
    );

    current = shifted;
    count += 1;
    bits = toBits(current);
    emit(
      'COUNT',
      `bits=${count}`,
      `After the shift current = ${current} and we increment the shift count to bits = ${count}. The highest set bit has moved down one position.`,
      { current, count, bits, msb: highestSetIndex(bits) },
    );
  }

  emit(
    'DONE',
    `log2=${count}`,
    `current = ${current} is no longer greater than 1, so the loop stops. We performed ${count} right-shift${count === 1 ? '' : 's'} to reduce ${n} down to 1, so floor(log2(${n})) = ${count}.`,
    { current, count, bits: toBits(current), msb: highestSetIndex(toBits(current)), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LogTwoState>) {
  const s = frame.state;
  const cells = s.bits.map((b) => String(b));
  const pointers: ArrayPointer[] = [];
  if (s.msb !== null) {
    pointers.push({ i: s.msb, label: 'msb', tone: s.done ? 'good' : 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.msb !== null && i === s.msb) return s.done ? 'found' : 'match';
    return s.bits[i] === 1 ? 'in-window' : '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.original}</span>
        {' · '}current ={' '}
        <span className="font-mono text-ink">{s.invalid ? '—' : s.current}</span>
      </div>
      {s.invalid ? (
        <div className={cn('mt-2 font-mono text-bad', vizText.base)}>n ≤ 0 → return -1</div>
      ) : (
        <>
          <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
          <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
            binary of current (MSB left) · shift count bits ={' '}
            <span className="text-ink">{s.count}</span>
          </div>
          {s.done && (
            <div className={cn('mt-1 font-mono text-good', vizText.base)}>
              → floor(log2({s.original})) = {s.count}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LogTwoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const bitsStr = s.invalid ? '—' : s.bits.join('');
  return (
    <VarGrid>
      <InspectorRow k="n (input)" v={s.original} />
      <InspectorRow k="current" v={s.invalid ? '—' : s.current} />
      <InspectorRow k="current (binary)" v={bitsStr} />
      <InspectorRow k="bits (shifts)" v={s.invalid ? '—' : s.count} />
      <InspectorRow k="answer" v={s.done ? (s.invalid ? -1 : s.count) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-log-two';
export const title = 'Log two';

function computeLogTwo(n: number): number {
  if (n <= 0) return -1;
  let bits = 0;
  let cur = n;
  while (cur > 1) {
    cur >>= 1;
    bits++;
  }
  return bits;
}






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Log two\"?",
    choices: [
      {
        label: "Integer log base 2 — fits this problem",
        correct: true
      },
      {
        label: "Fibonacci iterative — different approach"
      },
      {
        label: "Greedy (last occurrence) — different approach"
      },
      {
        label: "Bijective base-26 encoding — different approach"
      }
    ],
    explain: "Shift right until 1; count the shifts"
  },
  {
    id: "init",
    prompt: "At the start of a run (Log two), what strategy is established?",
    choices: [
      {
        label: "Shift right until 1; count — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "We want floor(log2()): how many times can we halve  (integer division) before we hit 1? Each halving is one right-shift n >>= 1, and we count the shifts. Start with bits = 0."
  },
  {
    id: "key-step",
    prompt: "On the \"COUNT\" step (bits=), what happens?",
    choices: [
      {
        label: "After the shift current = — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "After the shift current =  and we increment the shift count to bits = . The highest set bit has moved down one position."
  },
  {
    id: "state",
    prompt: "What does the `original` field track in the visualization state?",
    choices: [
      {
        label: "the starting n (never mutated) — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `original` in sync: the starting n (never mutated)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Log two\"?",
    choices: [
      {
        label: "O(log n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(reservations) time, O(reserved rows) — wrong order of growth"
      },
      {
        label: "O(log x) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(log n). O(1). bits=0; while n>1 { n>>=1; bits++ }"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "current = is no longer greater — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "current =  is no longer greater than 1, so the loop stops. We performed  right-shift to reduce  down to 1, so floor(log2()) = ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lt1', label: 'n = 37', value: { n: 37 } },
    { id: 'lt2', label: 'n = 16', value: { n: 16 } },
  ] satisfies SampleInput<LogTwoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LogTwoState | undefined;
    if (!s) return { ok: false, label: '—' };
    const answer = s.invalid ? -1 : s.count;
    const expected = computeLogTwo(s.original);
    return { ok: answer === expected, label: `log2 = ${answer}` };
  },
};
