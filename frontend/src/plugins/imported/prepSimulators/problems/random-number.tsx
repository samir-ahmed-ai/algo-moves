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

interface RandomNumberInput {
  minVal: number;
  maxVal: number;
  seed: number;
}

interface RandomNumberState {
  lo: number; // normalized min (after swap)
  hi: number; // normalized max (after swap)
  span: number | null; // hi - lo + 1, the count of candidates
  offset: number | null; // rng.Intn(span) result, in [0, span)
  pick: number | null; // lo + offset, the drawn value
  swapped: boolean; // whether we swapped min/max
  done: boolean;
}

/**
 * Deterministic stand-in for math/rand seeded with `seed`. A pure LCG keeps the
 * replay stable — we never call Math.random inside record. `intn(seed, span)`
 * returns a value in [0, span) that depends only on (seed, span), mirroring
 * `rng.Intn(span)` for a fixed seed.
 */
function intn(seed: number, span: number): number {
  // Numerical Recipes LCG constants, folded to a non-negative 32-bit value.
  const next = (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
  return next % span;
}

function record({ minVal, maxVal, seed }: RandomNumberInput): Frame<RandomNumberState>[] {
  let lo = minVal;
  let hi = maxVal;

  const { emit, frames } = createRecorder<RandomNumberState>(() => ({
    lo,
    hi,
    span: null,
    offset: null,
    pick: null,
    swapped: false,
    done: false,
  }));

  emit(
    'INIT',
    `[${minVal}, ${maxVal}]`,
    `Random Number: draw one value uniformly from the inclusive range [${minVal}, ${maxVal}] using a seeded generator. The whole trick is min + rng.Intn(max − min + 1).`,
    {},
  );

  let swapped = false;
  if (lo > hi) {
    const a = lo;
    lo = hi;
    hi = a;
    swapped = true;
    emit(
      'SWAP',
      `min↔max`,
      `min (${maxVal}) was greater than max (${minVal}), so we swap them. Now lo = ${lo} and hi = ${hi} form a valid range.`,
      { swapped: true },
    );
  } else {
    emit(
      'CHECK',
      `min ≤ max`,
      `min (${lo}) is already ≤ max (${hi}), so no swap is needed — the range is valid as given.`,
      { swapped: false },
    );
  }

  const span = hi - lo + 1;
  emit(
    'SPAN',
    `span=${span}`,
    `Count the candidates: span = hi − lo + 1 = ${hi} − ${lo} + 1 = ${span}. There are ${span} equally likely values to choose from.`,
    { span, swapped },
  );

  const offset = intn(seed, span);
  emit(
    'DRAW',
    `Intn=${offset}`,
    `Ask the seeded generator for an offset in [0, ${span}): rng.Intn(${span}) = ${offset}. Each offset from 0 to ${span - 1} is equally probable.`,
    { span, offset, swapped },
  );

  const pick = lo + offset;
  emit(
    'PICK',
    `${lo}+${offset}=${pick}`,
    `Shift the offset back into range: pick = lo + offset = ${lo} + ${offset} = ${pick}. That is our uniform random number in [${lo}, ${hi}].`,
    { span, offset, pick, swapped, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<RandomNumberState>) {
  const s = frame.state;
  const span = Math.max(s.hi - s.lo + 1, 0);
  const values: number[] = [];
  for (let v = s.lo; v <= s.hi; v++) values.push(v);

  const pickIdx = s.pick !== null ? s.pick - s.lo : null;
  const offsetIdx = s.offset;

  const pointers: ArrayPointer[] = [];
  if (offsetIdx !== null && s.pick === null) {
    pointers.push({ i: offsetIdx, label: `off ${offsetIdx}`, tone: 'accent', place: 'above' });
  }
  if (pickIdx !== null) {
    pointers.push({ i: pickIdx, label: `pick`, tone: 'good', place: 'below' });
  }

  const tone = (i: number) => {
    if (pickIdx !== null && i === pickIdx) return 'found';
    if (s.pick === null && offsetIdx !== null && i === offsetIdx) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        range ={' '}
        <span className="font-mono text-ink">
          [{s.lo}, {s.hi}]
        </span>
        {s.span !== null && (
          <>
            {' · '}span = <span className="font-mono text-ink">{s.span}</span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        pick = lo + Intn(span) = {s.lo} + {s.offset !== null ? s.offset : '·'} ={' '}
        <span className={s.done ? 'text-good' : 'text-ink'}>{s.pick !== null ? s.pick : '·'}</span>
      </div>
      {span === 0 && <div className={cn('mt-1', vizText.sm, 'text-ink3')}>empty range</div>}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RandomNumberState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="lo (min)" v={s.lo} />
      <InspectorRow k="hi (max)" v={s.hi} />
      <InspectorRow k="swapped" v={s.swapped ? 'yes' : 'no'} />
      <InspectorRow k="span (hi−lo+1)" v={s.span ?? '—'} />
      <InspectorRow k="Intn(span)" v={s.offset ?? '—'} />
      <InspectorRow k="pick (lo+offset)" v={s.pick ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-random-number';
export const title = 'Random number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Random number"?',
    choices: [
      {
        label: 'Uniform random in range — fits this problem',
        correct: true,
      },
      {
        label: 'Binary Exponentiation — different approach',
      },
      {
        label: 'Greedy roman numeral — different approach',
      },
      {
        label: 'Integer log base 2 — different approach',
      },
    ],
    explain: 'Uniform pick within [min,max] inclusive',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Random number), what strategy is established?',
    choices: [
      {
        label: 'Uniform pick within [min,max] inclusive — described in INIT caption',
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
      'Random Number: draw one value uniformly from the inclusive range [, ] using a seeded generator. The whole trick is min + rng.Intn(max − min + 1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "SPAN" step (span=), what happens?',
    choices: [
      {
        label: 'Count the candidates: span = hi — this move caption',
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
      'Count the candidates: span = hi − lo + 1 =  −  + 1 = . There are  equally likely values to choose from.',
  },
  {
    id: 'state',
    prompt: 'What does the `lo` field track in the visualization state?',
    choices: [
      {
        label: 'normalized min (after swap) — updated each frame',
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
    explain: 'The recorder keeps `lo` in sync: normalized min (after swap)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Random number"?',
    choices: [
      {
        label: 'O(1) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(log n) space — wrong order of growth',
      },
      {
        label: 'O(sqrt(n)) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(1). O(1). min + rng.Intn(max-min+1)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Shift the offset back into range: — final DONE caption',
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
      'Shift the offset back into range: pick = lo + offset =  +  = . That is our uniform random number in [, ].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rn1', label: '[3, 8] seed 7', value: { minVal: 3, maxVal: 8, seed: 7 } },
    { id: 'rn2', label: '[10, 4] seed 42', value: { minVal: 10, maxVal: 4, seed: 42 } },
  ] satisfies SampleInput<RandomNumberInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RandomNumberState | undefined;
    return s && s.pick !== null
      ? { ok: true, label: `pick = ${s.pick}` }
      : { ok: false, label: 'no pick' };
  },
};
