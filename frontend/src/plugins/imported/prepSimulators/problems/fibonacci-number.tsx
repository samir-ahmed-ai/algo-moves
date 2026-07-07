import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FibInput {
  n: number;
}

interface FibState {
  n: number;
  seq: number[]; // Fibonacci values computed so far, seq[k] = F(k)
  i: number | null; // index just produced (the new cur), i.e. F(i)
  prevIdx: number | null; // index of prev (a) in seq
  curIdx: number | null; // index of cur (b) in seq
  prev: number | null; // a
  cur: number | null; // b
  answer: number | null; // final F(n)
  done: boolean;
}

function record({ n }: FibInput): Frame<FibState>[] {
  // seq mirrors F(0..k) as we build it; used only for the visual, the algorithm
  // itself carries just prev/cur exactly like the Go solution.
  const seq: number[] = [0, 1];

  const { emit, frames } = createRecorder<FibState>(() => ({
    n,
    seq: seq.slice(),
    i: null,
    prevIdx: null,
    curIdx: null,
    prev: null,
    cur: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Fibonacci: F(n) = F(n−1) + F(n−2). We iterate in O(n) time and O(1) space, carrying just two rolling values (prev, cur) and sliding the pair (a, b) → (b, a+b) each step.`,
    {},
  );

  // Base case — mirrors `if n <= 1 { return n }`.
  if (n <= 1) {
    emit(
      'CHECK',
      `n=${n}≤1`,
      `Base-case check: n ≤ 1 means F(n) equals n itself — no rolling pair needed.`,
      { n },
    );
    emit(
      'BASE',
      `F(${n})=${n}`,
      `Base case: n ≤ 1, so F(${n}) = ${n} directly — no iteration needed.`,
      { i: n, curIdx: n, cur: n, answer: n, done: true },
      'good',
    );
    return frames;
  }

  let prev = 0;
  let cur = 1;
  emit(
    'SEED',
    `prev=0, cur=1`,
    `Seed the pair with the first two Fibonacci numbers: prev = F(0) = 0 and cur = F(1) = 1. We now roll forward from i = 2.`,
    { prevIdx: 0, curIdx: 1, prev, cur },
  );

  for (let i = 2; i <= n; i++) {
    const next = prev + cur;
    seq.push(next); // seq[i] = F(i)
    emit(
      'STEP',
      `F(${i})=${next}`,
      `Step i = ${i}: F(${i}) = prev + cur = ${prev} + ${cur} = ${next}. Slide the window forward — the old cur becomes the new prev, and this sum becomes the new cur.`,
      { i, prevIdx: i - 2, curIdx: i - 1, prev, cur },
    );
    prev = cur;
    cur = next;
  }

  emit(
    'DONE',
    `F(${n})=${cur}`,
    `The window reached i = ${n}. cur now holds F(${n}) = ${cur}, which is the answer.`,
    { i: n, prevIdx: n - 1, curIdx: n, prev, cur, answer: cur, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<FibState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.prevIdx !== null)
    pointers.push({ i: s.prevIdx, label: 'prev', tone: 'warn', place: 'below' });
  if (s.curIdx !== null)
    pointers.push({ i: s.curIdx, label: 'cur', tone: 'accent', place: 'below' });
  if (s.i !== null && s.done)
    pointers.push({ i: s.i, label: 'F(n)', tone: 'good', place: 'above' });

  const tone = (idx: number) => {
    if (s.done && s.answer !== null && idx === s.i) return 'found';
    if (idx === s.curIdx) return 'match';
    if (idx === s.prevIdx) return 'in-window';
    return '';
  };

  // Values shown as F(0..k); label each cell with its Fibonacci index.
  const labels = (idx: number) => `F${idx}`;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {' · '}goal = <span className="font-mono text-ink">F({s.n})</span>
        {s.answer !== null && (
          <>
            {' = '}
            <span className="font-mono text-good">{s.answer}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={s.seq}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={labels}
      />
      {s.prev !== null && s.cur !== null && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          prev = <span className="text-ink">{s.prev}</span>, cur ={' '}
          <span className="text-ink">{s.cur}</span> → next = prev + cur ={' '}
          <span className="text-ink">{s.prev + s.cur}</span>
        </div>
      )}
      {s.answer !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → F({s.n}) = {s.answer}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FibState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="prev (a)" v={s.prev ?? '—'} />
      <InspectorRow k="cur (b)" v={s.cur ?? '—'} />
      <InspectorRow
        k="next = a+b"
        v={s.prev !== null && s.cur !== null && !s.done ? s.prev + s.cur : '—'}
      />
      <InspectorRow k="F(n)" v={s.answer ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-fibonacci-number';
export const title = 'Fibonacci number';

function fib(n: number): number {
  if (n <= 1) return n;
  let prev = 0;
  let cur = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + cur;
    prev = cur;
    cur = next;
  }
  return cur;
}

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Fibonacci number"?',
    choices: [
      {
        label: 'Fibonacci iterative — fits this problem',
        correct: true,
      },
      {
        label: 'XOR + popcount — different approach',
      },
      {
        label: 'Grade-school multiplication — different approach',
      },
      {
        label: 'Base conversion repeated divmod — different approach',
      },
    ],
    explain: 'Slide the pair (a,b) -> (b, a+b)',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Fibonacci number), what strategy is established?',
    choices: [
      {
        label: 'Slide the pair (a,b) -> (b — described in INIT caption',
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
      'Fibonacci: F(n) = F(n−1) + F(n−2). We iterate in O(n) time and O(1) space, carrying just two rolling values (prev, cur) and sliding the pair (a, b) → (b, a+b) each step.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SEED" step (prev=0, cur=1), what happens?',
    choices: [
      {
        label: 'Seed the pair with the first — this move caption',
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
      'Seed the pair with the first two Fibonacci numbers: prev = F(0) = 0 and cur = F(1) = 1. We now roll forward from i = 2.',
  },
  {
    id: 'state',
    prompt: 'What does the `seq` field track in the visualization state?',
    choices: [
      {
        label: 'Fibonacci values computed so far — updated each frame',
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
    explain: 'The recorder keeps `seq` in sync: Fibonacci values computed so far, seq[k] = F(k)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Fibonacci number"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(m+n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). prev,cur=0,1; cur=prev+cur; n<=1 return n',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The window reached i = . — final DONE caption',
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
    explain: 'The window reached i = . cur now holds F() = , which is the answer.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'fib7', label: 'n = 7', value: { n: 7 } },
    { id: 'fib0', label: 'n = 0', value: { n: 0 } },
  ] satisfies SampleInput<FibInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FibState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const answer = s.answer ?? fib(s.n);
    return { ok: true, label: `F(${s.n}) = ${answer}` };
  },
};
