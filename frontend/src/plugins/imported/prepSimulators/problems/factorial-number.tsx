import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FactorialInput {
  n: number;
}

interface FactorialState {
  n: number;
  factors: number[]; // the multiplicands 2..n laid out as a row
  i: number | null; // current factor value being multiplied in
  idx: number | null; // index of that factor in the `factors` row
  before: number | null; // accumulator before this multiply
  result: number; // running accumulator (final = n!)
  done: boolean;
}

function record({ n }: FactorialInput): Frame<FactorialState>[] {  const factors: number[] = [];
  for (let i = 2; i <= n; i++) factors.push(i);

  const { emit, frames } = createRecorder<FactorialState>(() => ({
        n,
        factors,
        i: null,
        idx: null,
        before: null,
        result: 1,
        done: false
      }));

  if (n < 0) {
    emit(
      'GUARD',
      'n < 0',
      `Factorial is undefined for negative n. The Go solution returns 0 for n = ${n} rather than looping.`,
      { result: 0, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'INIT',
    `n=${n}`,
    `Factorial number: compute n! = 1·2·3·…·n iteratively. Start an accumulator result = 1, then fold each factor from 2 up to ${n} into it. Time O(n), Space O(1).`,
    { result: 1 },
  );

  let result = 1;
  emit(
    'BASE',
    'result=1',
    `Seed the accumulator: result = 1. This is the identity for multiplication and also the correct answer for 0! and 1! (the loop below runs zero times for n ≤ 1).`,
    { result },
  );

  for (let k = 0; k < factors.length; k++) {
    const i = factors[k];
    const before = result;
    result *= i;
    emit(
      'MUL',
      `×${i} → ${result}`,
      `Multiply factor ${i} into the accumulator: result = ${before} × ${i} = ${result}. This folds ${i} into the running product 1·2·…·${i}.`,
      { i, idx: k, before, result },
    );
  }

  emit(
    'DONE',
    `${n}! = ${result}`,
    `All factors up to ${n} have been multiplied in. ${n}! = ${result}.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FactorialState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.idx !== null) pointers.push({ i: s.idx, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.idx === i) return 'match';
    if (s.idx !== null && i < s.idx) return 'dead';
    return '';
  };
  const cells = s.factors.length > 0 ? s.factors : ['—'];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · factors 2…{s.n}
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.i !== null && s.before !== null ? (
          <>
            result = <span className="text-ink3">{s.before}</span>
            {' × '}
            <span className="text-accent">{s.i}</span>
            {' = '}
            <span className="text-ink">{s.result}</span>
          </>
        ) : (
          <>
            result = <span className="text-ink">{s.result}</span>
          </>
        )}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono', s.n < 0 ? 'text-bad' : 'text-good', vizText.base)}>
          → {s.n}! = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FactorialState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="i (factor)" v={s.i ?? '—'} />
      <InspectorRow k="result before" v={s.before ?? '—'} />
      <InspectorRow k="result" v={s.result} />
      <InspectorRow k="answer" v={s.done ? `${s.n}! = ${s.result}` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-factorial-number';
export const title = 'Factorial number';

function factorialNumber(n: number): number {
  if (n < 0) return 0;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Factorial number\"?",
    choices: [
      {
        label: "Iterative factorial — fits this problem",
        correct: true
      },
      {
        label: "atoi parse with overflow guard — different approach"
      },
      {
        label: "Sort — different approach"
      },
      {
        label: "Uniform random in range — different approach"
      }
    ],
    explain: "Multiply 1..n into an accumulator"
  },
  {
    id: "init",
    prompt: "At the start of a run (Factorial number), what strategy is established?",
    choices: [
      {
        label: "Multiply 1..n into an accumulator — described in INIT caption",
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
    explain: "Factorial number: compute n! = 1·2·3·…·n iteratively. Start an accumulator result = 1, then fold each factor from 2 up to  into it. Time O(n), Space O(1)."
  },
  {
    id: "key-step",
    prompt: "On the \"MUL\" step (× → ), what happens?",
    choices: [
      {
        label: "Multiply factor into the accumulator: — this move caption",
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
    explain: "Multiply factor  into the accumulator: result =  ×  = . This folds  into the running product 1·2·…·."
  },
  {
    id: "state",
    prompt: "What does the `factors` field track in the visualization state?",
    choices: [
      {
        label: "the multiplicands 2..n laid out — updated each frame",
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
    explain: "The recorder keeps `factors` in sync: the multiplicands 2..n laid out as a row"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Factorial number\"?",
    choices: [
      {
        label: "O(n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(d) time, O(d) space — wrong order of growth"
      },
      {
        label: "O(bits set) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(1). result=1; for i=2..n result*=i"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "All factors up — final DONE caption",
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
    explain: "All factors up to  have been multiplied in. ! = ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'fn5', label: 'n = 5', value: { n: 5 } },
    { id: 'fn0', label: 'n = 0', value: { n: 0 } },
  ] satisfies SampleInput<FactorialInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FactorialState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const expected = factorialNumber(s.n);
    return { ok: s.result === expected, label: `${s.n}! = ${s.result}` };
  },
};
