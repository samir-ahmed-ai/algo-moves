import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseInput {
  n: number;
}

interface ReverseState {
  original: number; // the input, signed
  neg: boolean; // was the input negative
  digits: string[]; // digits of |original|, most-significant first (for display)
  n: number; // the working value we keep dividing down
  rev: number; // reversed accumulator (magnitude)
  popped: number | null; // last digit peeled off via n % 10
  consumed: number; // how many digits have been peeled (from the right)
  done: boolean;
  answer: number | null; // signed final answer
}

function reverseNumber(input: number): number {
  let n = input;
  const neg = n < 0;
  if (neg) n = -n;
  let rev = 0;
  while (n > 0) {
    rev = rev * 10 + (n % 10);
    n = Math.floor(n / 10);
  }
  return neg ? -rev : rev;
}

function record({ n: input }: ReverseInput): Frame<ReverseState>[] {  const neg = input < 0;
  const magnitude = Math.abs(input);
  const digits = String(magnitude).split('');
  const total = digits.length;

  let n = magnitude;
  let rev = 0;

  const { emit, frames } = createRecorder<ReverseState>(() => ({
        original: input,
        neg,
        digits,
        n,
        rev,
        popped: null,
        consumed: 0,
        done: false,
        answer: null
      }));

  emit(
    'INIT',
    `n=${input}`,
    `Reverse Number: flip the digit order of ${input}. We peel the last digit off n with n % 10 and push it onto a growing reversed value rev, then drop that digit with n /= 10. Sign is handled separately.`,
    { consumed: 0 },
  );

  if (neg) {
    emit(
      'SIGN',
      'negative',
      `${input} is negative, so record the minus sign and work with the magnitude ${magnitude}. We reattach the sign to the result at the end.`,
      { consumed: 0 },
    );
  }

  let consumed = 0;
  while (n > 0) {
    const digit = n % 10;
    const nextRev = rev * 10 + digit;
    emit(
      'POP',
      `%10 → ${digit}`,
      `Peel the last digit of ${n}: ${n} % 10 = ${digit}. Push it onto rev: rev = ${rev} × 10 + ${digit} = ${nextRev}.`,
      { popped: digit, rev: nextRev, consumed: consumed + 1 },
    );
    rev = nextRev;
    const nextN = Math.floor(n / 10);
    consumed += 1;
    emit(
      'DIV',
      `/10 → ${nextN}`,
      `Drop that digit with integer division: n = ${n} / 10 = ${nextN}. ${nextN > 0 ? 'Still more digits to process.' : 'n is now 0 — the loop ends.'}`,
      { popped: digit, n: nextN, rev, consumed },
    );
    n = nextN;
  }

  const answer = neg ? -rev : rev;
  emit(
    'DONE',
    `${answer}`,
    `n reached 0, so every digit has been moved. rev = ${rev}${neg ? `, and reattaching the minus sign gives ${answer}` : ` is the answer`}. Reversing ${input} yields ${answer}.`,
    { n: 0, rev, done: true, answer, consumed: total },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ReverseState>) {
  const s = frame.state;
  const total = s.digits.length;
  // Digits are shown most-significant first; we consume from the right, so the
  // pointer sits on the right-most not-yet-consumed digit.
  const activeIdx = s.done ? -1 : total - 1 - s.consumed;
  const pointers: ArrayPointer[] = [];
  if (activeIdx >= 0) pointers.push({ i: activeIdx, label: 'n%10', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.done) return 'found';
    // consumed digits are the last `consumed` cells (right side)
    if (i >= total - s.consumed) return 'dead';
    if (i === activeIdx) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        input = <span className="font-mono text-ink">{s.original}</span>
        {s.neg && <span className="font-mono text-ink3">{'  (sign held: −)'}</span>}
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        n = <span className="text-ink">{s.n}</span>
        {s.popped !== null && !s.done && (
          <>
            {'   ·   popped = '}
            <span className="text-ink">{s.popped}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        rev = {s.neg && s.done ? '−' : ''}
        {s.rev}
        {s.done ? ` = ${s.answer}` : ''}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="input" v={s.original} />
      <InspectorRow k="negative" v={s.neg ? 'yes' : 'no'} />
      <InspectorRow k="n (working)" v={s.n} />
      <InspectorRow k="last n%10" v={s.popped ?? '—'} />
      <InspectorRow k="rev" v={s.rev} />
      <InspectorRow k="answer" v={s.answer ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-reverse-number';
export const title = 'Reverse number';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Reverse number\"?",
    choices: [
      {
        label: "Digit reversal — fits this problem",
        correct: true
      },
      {
        label: "FizzBuzz conditional — different approach"
      },
      {
        label: "Math (sum - n*min) — different approach"
      },
      {
        label: "Base conversion repeated divmod — different approach"
      }
    ],
    explain: "Pop the last digit and push it onto the reversed value"
  },
  {
    id: "init",
    prompt: "At the start of a run (Reverse number), what strategy is established?",
    choices: [
      {
        label: "Pop the last digit and push — described in INIT caption",
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
    explain: "Reverse Number: flip the digit order of . We peel the last digit off n with n % 10 and push it onto a growing reversed value rev, then drop that digit with n /= 10. Sign is handled separately."
  },
  {
    id: "key-step",
    prompt: "On the \"DIV\" step (/10 → ), what happens?",
    choices: [
      {
        label: "Drop that digit with integer division: — this move caption",
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
    explain: "Drop that digit with integer division: n =  / 10 = . "
  },
  {
    id: "state",
    prompt: "What does the `original` field track in the visualization state?",
    choices: [
      {
        label: "the input, signed — updated each frame",
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
    explain: "The recorder keeps `original` in sync: the input, signed"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Reverse number\"?",
    choices: [
      {
        label: "O(log n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(n²) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m·n) time, O(m+n) space — wrong order of growth"
      }
    ],
    explain: "O(log n). O(1). rev=rev*10+n%10; n/=10"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "n reached 0, so every digit — final DONE caption",
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
    explain: "n reached 0, so every digit has been moved. rev = ${neg ? "
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rn1', label: 'n = 1234', value: { n: 1234 } },
    { id: 'rn2', label: 'n = -507', value: { n: -507 } },
  ] satisfies SampleInput<ReverseInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const expected = reverseNumber(s.original);
    const got = s.answer ?? 0;
    return { ok: got === expected, label: `${got}` };
  },
};
