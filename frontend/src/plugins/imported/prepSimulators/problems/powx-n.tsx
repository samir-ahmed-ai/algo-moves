import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PowInput {
  x: number;
  n: number;
}

interface PowState {
  x: number; // original exponent input, for display
  n: number; // original power input, for display
  negative: boolean; // was n < 0 (so base is reciprocal)?
  base: number; // current squared base value
  bits: string[]; // binary digits of |n|, LSB first (index 0 = bit 0)
  i: number | null; // bit index currently being processed
  res: number; // accumulated result
  done: boolean;
}

function round(v: number): number {
  // Trim floating noise so captions read cleanly (x^n on tiny inputs is exact-ish).
  return Math.round(v * 1e6) / 1e6;
}

function record({ x, n }: PowInput): Frame<PowState>[] {
  let base = x;
  let N = n;
  const negative = n < 0;
  if (negative) {
    base = 1 / x;
    N = -n;
  }

  // Binary digits of |n|, least-significant first (matches the N%2 / N/=2 loop order).
  const bits: string[] = [];
  let tmp = N;
  if (tmp === 0) bits.push('0');
  while (tmp > 0) {
    bits.push((tmp % 2).toString());
    tmp = Math.floor(tmp / 2);
  }

  const { emit, frames } = createRecorder<PowState>(() => ({
        x,
        n,
        negative,
        base,
        bits,
        i: null,
        res: 1,
        done: false
      }));

  emit(
    'INIT',
    `x=${x}, n=${n}`,
    `Pow(x, n): compute ${x}^${n} with binary exponentiation. Read the exponent's bits from lowest to highest; each iteration squares the base and multiplies it into the result whenever the current bit is 1. Time O(log n), Space O(1).`,
    {},
  );

  if (negative) {
    emit(
      'NEGATE',
      `base=1/${x}`,
      `n = ${n} is negative, so x^n = (1/x)^${N}. Flip the base to 1/${x} = ${round(base)} and treat the exponent as |n| = ${N}.`,
      { base, res: 1 },
    );
  }

  let res = 1;
  let curBase = base;

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    if (bit === '1') {
      const before = res;
      res = res * curBase;
      emit(
        'MULT',
        `res*=${round(curBase)}`,
        `Bit ${i} of |n| is 1, so this power-of-two chunk (x^${1 << i}) belongs in the answer: res = ${round(before)} × ${round(curBase)} = ${round(res)}.`,
        { i, base: curBase, res },
        'good',
      );
    } else {
      emit(
        'SKIP',
        `bit ${i}=0`,
        `Bit ${i} of |n| is 0, so x^${1 << i} is not part of the exponent. Leave res = ${round(res)} unchanged.`,
        { i, base: curBase, res },
      );
    }

    const nextBase = curBase * curBase;
    // Only show the squaring step if there is another bit to process.
    if (i < bits.length - 1) {
      emit(
        'SQUARE',
        `base=${round(nextBase)}`,
        `Square the base so it represents the next power of two: ${round(curBase)}² = ${round(nextBase)} (this is x^${1 << (i + 1)}). Move to bit ${i + 1}.`,
        { i, base: nextBase, res },
      );
    }
    curBase = nextBase;
  }

  emit(
    'DONE',
    `${round(res)}`,
    `All bits processed. ${x}^${n} = ${round(res)}.`,
    { res, base: curBase, done: true, i: null },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PowState>) {
  const s = frame.state;
  // Display bits most-significant first (natural reading order), remember mapping to LSB index.
  const msbFirst = [...s.bits].reverse();
  const lsbIndexAt = (display: number) => s.bits.length - 1 - display;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    const disp = s.bits.length - 1 - s.i;
    pointers.push({ i: disp, label: `bit ${s.i}`, tone: 'accent', place: 'above' });
  }
  const tone = (display: number) => {
    const lsb = lsbIndexAt(display);
    if (s.i === lsb) return 'match';
    return msbFirst[display] === '1' ? 'found' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        computing <span className="font-mono text-ink">{s.x}</span>
        <sup className="font-mono text-ink">{s.n}</sup>
        {s.negative && (
          <>
            {' · base = 1/'}
            <span className="font-mono text-ink">{s.x}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>|n| in binary (MSB → LSB):</div>
      <ArrayRow
        values={msbFirst}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={(display) => `2^${lsbIndexAt(display)}`}
      />
      <div className={cn('mt-2 font-mono', vizText.base, 'text-ink')}>
        base = {round(s.base)}
      </div>
      <div className={cn('font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        res&nbsp;&nbsp;= {round(s.res)}
        {s.done && ' ✓'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PowState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curBit = s.i !== null && s.i >= 0 && s.i < s.bits.length ? s.bits[s.i] : '—';
  return (
    <VarGrid>
      <InspectorRow k="x" v={s.x} />
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="negative" v={s.negative ? 'yes (1/x)' : 'no'} />
      <InspectorRow k="bit i" v={s.i ?? '—'} />
      <InspectorRow k="bits[i]" v={curBit} />
      <InspectorRow k="base" v={round(s.base)} />
      <InspectorRow k="res" v={round(s.res)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-powx-n';
export const title = 'Pow(x, n)';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Pow(x, n)\"?",
    choices: [
      {
        label: "Binary Exponentiation — fits this problem",
        correct: true
      },
      {
        label: "Strobogrammatic map — different approach"
      },
      {
        label: "Uniform random in range — different approach"
      },
      {
        label: "Gauss sum XOR trick — different approach"
      }
    ],
    explain: "See Powx N pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (Pow(x, n)), what strategy is established?",
    choices: [
      {
        label: "See Powx N pattern — described in INIT caption",
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
    explain: "Pow(x, n): compute ^ with binary exponentiation. Read the exponent's bits from lowest to highest; each iteration squares the base and multiplies it into the result whenever the current bit is 1. Time O(log n), Space O(1)."
  },
  {
    id: "key-step",
    prompt: "On the \"SKIP\" step (bit =0), what happens?",
    choices: [
      {
        label: "Bit of |n| is 0 — this move caption",
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
    explain: "Bit  of |n| is 0, so x^ is not part of the exponent. Leave res =  unchanged."
  },
  {
    id: "state",
    prompt: "What does the `x` field track in the visualization state?",
    choices: [
      {
        label: "original exponent input, for display — updated each frame",
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
    explain: "The recorder keeps `x` in sync: original exponent input, for display"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Pow(x, n)\"?",
    choices: [
      {
        label: "O(log n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(d) time, O(d) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(log n). O(1). Powx N"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "All bits processed. ^ = . — final DONE caption",
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
    explain: "All bits processed. ^ = ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'pow1', label: '2^10', value: { x: 2, n: 10 } },
    { id: 'pow2', label: '2^-3', value: { x: 2, n: -3 } },
  ] satisfies SampleInput<PowInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PowState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `${s.x}^${s.n} = ${round(s.res)}` };
  },
};
