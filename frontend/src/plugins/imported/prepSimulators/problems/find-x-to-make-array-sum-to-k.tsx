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

interface FindXInput {
  a: number[];
  target: number;
}

interface FindXState {
  a: number[]; // sorted array
  target: number;
  lo: number | null; // low candidate for x
  hi: number | null; // high candidate for x
  mid: number | null; // x being tested this step
  capped: number | null; // cappedSum(a, mid) for this step
  result: number | null; // answer x once found
  done: boolean;
}

/** Sum of the array with every value capped at x — rises monotonically with x. */
function cappedSum(a: number[], x: number): number {
  let s = 0;
  for (const v of a) s += v > x ? x : v;
  return s;
}

function record({ a, target }: FindXInput): Frame<FindXState>[] {
  const sorted = [...a].sort((p, q) => p - q);

  const { emit, frames } = createRecorder<FindXState>(() => ({
    a: sorted,
    target,
    lo: null,
    hi: null,
    mid: null,
    capped: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `target=${target}`,
    `Find the smallest cap x so that capping every value at x makes the array sum reach ${target}. cappedSum(a, x) only ever grows as x grows, so we can binary-search x. First sort the array: [${sorted.join(', ')}].`,
    {},
  );

  let lo = sorted[0];
  let hi = sorted[sorted.length - 1];

  emit(
    'BOUNDS',
    `lo=${lo} hi=${hi}`,
    `Start the search window at lo = min value (${lo}) and hi = max value (${hi}). The answer x must lie at or above lo; we may have to push hi outward if the largest value still isn't enough.`,
    { lo, hi },
  );

  // Grow hi until cappedSum(a, hi) >= target (matches the Go hi *= 2 loop).
  while (cappedSum(sorted, hi) < target) {
    const cap = cappedSum(sorted, hi);
    const next = hi * 2;
    emit(
      'GROW',
      `cap(${hi})=${cap}<${target}`,
      `Even with x = hi = ${hi}, cappedSum = ${cap} which is below ${target}. Double hi to ${next} so the window is guaranteed to contain a workable x.`,
      { lo, hi, mid: hi, capped: cap },
    );
    hi = next;
  }

  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const cap = cappedSum(sorted, mid);
    if (cap >= target) {
      emit(
        'TEST',
        `cap(${mid})=${cap}>=${target}`,
        `Test mid = ${mid}: cappedSum = ${cap} which is at least ${target}. This x works, but a smaller one might too — keep it as a candidate by setting hi = mid.`,
        { lo, hi, mid, capped: cap },
        'good',
      );
      hi = mid;
    } else {
      emit(
        'TEST',
        `cap(${mid})=${cap}<${target}`,
        `Test mid = ${mid}: cappedSum = ${cap} which is below ${target}. This x is too small, so discard it and everything beneath it by setting lo = mid + 1.`,
        { lo, hi, mid, capped: cap },
        'bad',
      );
      lo = mid + 1;
    }
  }

  const answer = lo;
  emit(
    'DONE',
    `x=${answer}`,
    `lo and hi have met at x = ${answer}. cappedSum(a, ${answer}) = ${cappedSum(sorted, answer)} ≥ ${target}, and no smaller cap reaches ${target}. The answer is ${answer}.`,
    {
      lo: answer,
      hi: answer,
      mid: answer,
      capped: cappedSum(sorted, answer),
      result: answer,
      done: true,
    },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<FindXState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];

  // Place lo / hi / mid pills under the array cell whose value is closest to
  // each candidate cap, so the picture reads as "where does this cap fall".
  const nearest = (x: number | null): number => {
    if (x === null) return -1;
    let best = 0;
    for (let i = 1; i < s.a.length; i++) {
      if (Math.abs(s.a[i] - x) < Math.abs(s.a[best] - x)) best = i;
    }
    return best;
  };

  if (s.lo !== null)
    pointers.push({ i: nearest(s.lo), label: `lo=${s.lo}`, tone: 'good', place: 'below' });
  if (s.hi !== null)
    pointers.push({ i: nearest(s.hi), label: `hi=${s.hi}`, tone: 'bad', place: 'below' });
  if (s.mid !== null && !s.done)
    pointers.push({ i: nearest(s.mid), label: `x=${s.mid}`, tone: 'accent', place: 'above' });

  // A value is "capped" by the current x when it exceeds x.
  const tone = (i: number) => {
    if (s.result !== null) return s.a[i] > s.result ? 'found' : '';
    if (s.mid !== null && s.a[i] > s.mid) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target = <span className="font-mono text-ink">{s.target}</span>
        {s.mid !== null && (
          <>
            {' · '}testing x = <span className="font-mono text-ink">{s.mid}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.a} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.mid !== null && s.capped !== null ? (
          <>
            cappedSum(a, {s.mid}) = <span className="text-ink">{s.capped}</span>{' '}
            {s.capped >= s.target ? '≥' : '<'} {s.target}
          </>
        ) : (
          'highlighted cells are above the current cap x'
        )}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ x = {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FindXState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="lo" v={s.lo ?? '—'} />
      <InspectorRow k="hi" v={s.hi ?? '—'} />
      <InspectorRow k="mid (x tested)" v={s.mid ?? '—'} />
      <InspectorRow k="cappedSum(a, mid)" v={s.capped ?? '—'} />
      <InspectorRow k="answer x" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-x-to-make-array-sum-to-k';
export const title = 'Find X to make array sum to K';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find X to make array sum to K"?',
    choices: [
      {
        label: 'Binary search on answer — fits this problem',
        correct: true,
      },
      {
        label: 'Custom hash key / struct map — different approach',
      },
      {
        label: 'Sliding window + frequency map — different approach',
      },
      {
        label: 'Hash map chain reconstruction — different approach',
      },
    ],
    explain: 'Cap each value at x; cappedSum rises monotonically with x',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find X to make array sum to K), what strategy is established?',
    choices: [
      {
        label: 'Cap each value at x; cappedSum — described in INIT caption',
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
      'Find the smallest cap x so that capping every value at x makes the array sum reach . cappedSum(a, x) only ever grows as x grows, so we can binary-search x. First sort the array: [].',
  },
  {
    id: 'key-step',
    prompt: 'On the "TEST" step (cap()=>=), what happens?',
    choices: [
      {
        label: 'Test mid = : cappedSum = — this move caption',
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
      'Test mid = : cappedSum =  which is at least . This x works, but a smaller one might too — keep it as a candidate by setting hi = mid.',
  },
  {
    id: 'state',
    prompt: 'What does the `a` field track in the visualization state?',
    choices: [
      {
        label: 'sorted array — updated each frame',
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
    explain: 'The recorder keeps `a` in sync: sorted array',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find X to make array sum to K"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) average time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n·e·α(n)) time, O(n·e) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(n). binary-search x on cappedSum(a,x) >= target',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'lo and hi have met — final DONE caption',
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
      'lo and hi have met at x = . cappedSum(a, ) =  ≥ , and no smaller cap reaches . The answer is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'fx1', label: '[1,2,5,8] → 9', value: { a: [1, 2, 5, 8], target: 9 } },
    { id: 'fx2', label: '[3,1,4,1,5] → 8', value: { a: [3, 1, 4, 1, 5], target: 8 } },
  ] satisfies SampleInput<FindXInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FindXState | undefined;
    return s && s.result !== null
      ? { ok: true, label: `x = ${s.result}` }
      : { ok: false, label: 'no x' };
  },
};
