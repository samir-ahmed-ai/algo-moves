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

interface SqrtInput {
  x: number;
}

interface SqrtState {
  x: number;
  // Candidate answers are the integers 1..x/2 laid out as a row.
  // These indices are into that row (candidate value = index + 1).
  lo: number | null;
  mid: number | null;
  hi: number | null;
  ans: number; // best integer whose square is <= x so far
  check: string | null; // "mid <= x/mid ?" line for the current step
  result: number | null; // final floor(sqrt(x))
  done: boolean;
}

// Number of candidate cells to render: the search space is [1, x/2].
function candidateCount(x: number): number {
  return x < 2 ? 0 : Math.floor(x / 2);
}

function record({ x }: SqrtInput): Frame<SqrtState>[] {
  const { emit, frames } = createRecorder<SqrtState>(() => ({
    x,
    lo: null,
    mid: null,
    hi: null,
    ans: 1,
    check: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `x=${x}`,
    `Square Root: compute floor(√${x}) — the largest integer whose square is at most ${x}. Instead of scanning, we binary-search the answer in the range [1, ⌊x/2⌋]. Time O(log x), Space O(1).`,
    {},
  );

  // Base case: for x < 2 the answer is x itself (0 or 1).
  if (x < 2) {
    emit(
      'BASE',
      `√${x}=${x}`,
      `Base case: for x < 2 the floor square root is just x itself. floor(√${x}) = ${x}.`,
      { result: x, ans: x, done: true },
      'good',
    );
    return frames;
  }

  let lo = 1;
  let hi = Math.floor(x / 2);
  let ans = 1;

  emit(
    'RANGE',
    `[1, ${hi}]`,
    `Any integer larger than ⌊${x}/2⌋ = ${hi} squares past ${x}, so the answer lies in [1, ${hi}]. Start with lo=1, hi=${hi}, ans=1.`,
    { lo: lo - 1, hi: hi - 1, ans },
  );

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    // Compare mid <= x/mid (integer division) — equivalent to mid*mid <= x without overflow.
    const rhs = Math.floor(x / mid);
    const fits = mid <= rhs;
    emit(
      'MID',
      `mid=${mid}`,
      `Pick mid = lo + (hi−lo)/2 = ${mid}. Test whether mid fits: compare mid ≤ ⌊${x}/mid⌋ = ⌊${x}/${mid}⌋ = ${rhs} (an overflow-safe way to ask mid·mid ≤ ${x}).`,
      { lo: lo - 1, mid: mid - 1, hi: hi - 1, ans, check: `${mid} ≤ ⌊${x}/${mid}⌋ = ${rhs} ?` },
    );

    if (fits) {
      ans = mid;
      const prevLo = lo;
      lo = mid + 1;
      emit(
        'FIT',
        `ans=${mid}`,
        `${mid} ≤ ${rhs} is true, so ${mid}·${mid} ≤ ${x}: ${mid} is a valid answer. Record ans=${mid} and search higher — move lo from ${prevLo} to ${lo}.`,
        {
          lo: lo - 1,
          mid: mid - 1,
          hi: hi - 1,
          ans,
          check: `${mid} ≤ ${rhs} ✓ → ans=${mid}, lo=${lo}`,
        },
        'good',
      );
    } else {
      const prevHi = hi;
      hi = mid - 1;
      emit(
        'SHRINK',
        `hi=${hi}`,
        `${mid} ≤ ${rhs} is false, so ${mid}·${mid} > ${x}: ${mid} is too big. Discard it and everything above — move hi from ${prevHi} to ${hi}.`,
        {
          lo: lo - 1,
          mid: mid - 1,
          hi: hi - 1,
          ans,
          check: `${mid} ≤ ${rhs} ✗ → hi=${hi}`,
        },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `√${x}=${ans}`,
    `lo passed hi, so the search is done. The largest integer whose square is ≤ ${x} is ${ans}. floor(√${x}) = ${ans}.`,
    { ans, result: ans, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SqrtState>) {
  const s = frame.state;
  const n = candidateCount(s.x);
  // Candidate row: cell index i holds the candidate integer i+1.
  const values: number[] = Array.from({ length: n }, (_, i) => i + 1);

  const pointers: ArrayPointer[] = [];
  if (s.lo !== null && s.lo >= 0 && s.lo < n)
    pointers.push({ i: s.lo, label: 'lo', tone: 'good', place: 'below' });
  if (s.hi !== null && s.hi >= 0 && s.hi < n)
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  if (s.mid !== null && s.mid >= 0 && s.mid < n)
    pointers.push({ i: s.mid, label: 'mid', tone: 'accent', place: 'above' });

  const inRange = (i: number) => s.lo !== null && s.hi !== null && i >= s.lo && i <= s.hi;

  const tone = (i: number) => {
    if (s.done && s.result !== null && i === s.result - 1) return 'found';
    if (s.mid === i) return 'mid';
    if (s.lo === i) return 'lo';
    if (s.hi === i) return 'hi';
    if (!s.done && inRange(i)) return 'in-window';
    return 'dead';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        x = <span className="font-mono text-ink">{s.x}</span> · candidates 1..⌊x/2⌋ · best ans ={' '}
        <span className="font-mono text-ink">{s.ans}</span>
      </div>
      {n > 0 ? (
        <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono text-ink', vizText.base)}>x &lt; 2 — answer is x itself</div>
      )}
      {s.check && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>{s.check}</div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → floor(√{s.x}) = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SqrtState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const val = (i: number | null) => (i !== null && i >= 0 ? i + 1 : '—');
  return (
    <VarGrid>
      <InspectorRow k="x" v={s.x} />
      <InspectorRow k="lo" v={val(s.lo)} />
      <InspectorRow k="mid" v={val(s.mid)} />
      <InspectorRow k="hi" v={val(s.hi)} />
      <InspectorRow k="ans (best)" v={s.ans} />
      <InspectorRow k="result" v={s.result !== null ? s.result : s.done ? s.ans : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-square-root';
export const title = 'Square root';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Square root"?',
    choices: [
      {
        label: 'Binary search sqrt — fits this problem',
        correct: true,
      },
      {
        label: 'XOR + popcount — different approach',
      },
      {
        label: 'Grade-school multiplication — different approach',
      },
      {
        label: 'atoi parse with overflow guard — different approach',
      },
    ],
    explain: 'Binary search the answer in [1, x/2]',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Square root), what strategy is established?',
    choices: [
      {
        label: 'Binary search the answer in [1 — described in INIT caption',
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
      'Square Root: compute floor(√) — the largest integer whose square is at most . Instead of scanning, we binary-search the answer in the range [1, ⌊x/2⌋]. Time O(log x), Space O(1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "MID" step (mid=), what happens?',
    choices: [
      {
        label: 'Pick mid = lo + (hi−lo)/2 — this move caption',
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
      'Pick mid = lo + (hi−lo)/2 = . Test whether mid fits: compare mid ≤ ⌊/mid⌋ = ⌊/⌋ =  (an overflow-safe way to ask mid·mid ≤ ).',
  },
  {
    id: 'state',
    prompt: 'What does the `ans` field track in the visualization state?',
    choices: [
      {
        label: 'best integer whose square — updated each frame',
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
    explain: 'The recorder keeps `ans` in sync: best integer whose square is <= x so far',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Square root"?',
    choices: [
      {
        label: 'O(log x) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(m+n) space — wrong order of growth',
      },
    ],
    explain: 'O(log x). O(1). mid<=x/mid -> ans=mid, lo=mid+1; else hi=mid-1',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'lo passed hi, so the search — final DONE caption',
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
      'lo passed hi, so the search is done. The largest integer whose square is ≤  is . floor(√) = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sqrt16', label: 'x = 16', value: { x: 16 } },
    { id: 'sqrt8', label: 'x = 8', value: { x: 8 } },
  ] satisfies SampleInput<SqrtInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqrtState | undefined;
    const v = s ? (s.result ?? s.ans) : 0;
    return { ok: true, label: `√ = ${v}` };
  },
};
