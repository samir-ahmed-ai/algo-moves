import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FizzBuzzInput {
  n: number;
}

interface FizzBuzzState {
  n: number;
  out: string[]; // filled results so far; '' = not filled yet
  i: number | null; // current number being classified (1-based)
  by15: boolean | null; // did i % 15 == 0 (the check we make first)?
  by3: boolean | null; // did i % 3 == 0?
  by5: boolean | null; // did i % 5 == 0?
  picked: string | null; // the word placed for i this step
  done: boolean;
}

function record({ n }: FizzBuzzInput): Frame<FizzBuzzState>[] {
  const out = new Array<string>(n).fill('');

  const { emit, frames } = createPrepRecorder<FizzBuzzState>(() => ({
    n,
    out: out.slice(),
    i: null,
    by15: null,
    by3: null,
    by5: null,
    picked: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `FizzBuzz: for every number 1..${n} we print "FizzBuzz" if it is divisible by 15, else "Fizz" if divisible by 3, else "Buzz" if divisible by 5, otherwise the number itself. Order matters — the 15 check must come first.`,
    {},
  );

  for (let i = 1; i <= n; i++) {
    const by15 = i % 15 === 0;
    const by3 = i % 3 === 0;
    const by5 = i % 5 === 0;
    let picked: string;
    let caption: string;
    let tone: 'good' | 'bad' | undefined;

    if (by15) {
      picked = 'FizzBuzz';
      caption = `${i} % 15 = 0, so ${i} is divisible by both 3 and 5 — print "FizzBuzz". Checking 15 first is what stops us from wrongly printing just "Fizz" or "Buzz" here.`;
      tone = 'good';
    } else if (by3) {
      picked = 'Fizz';
      caption = `${i} % 15 ≠ 0 but ${i} % 3 = 0, so ${i} is a multiple of 3 (not 5) — print "Fizz".`;
    } else if (by5) {
      picked = 'Buzz';
      caption = `${i} % 15 ≠ 0 and ${i} % 3 ≠ 0, but ${i} % 5 = 0 — so ${i} is a multiple of 5 (not 3) — print "Buzz".`;
    } else {
      picked = String(i);
      caption = `${i} is not divisible by 3, 5, or 15, so none of the conditions fire — print the number itself, "${i}".`;
    }

    out[i - 1]! = picked;
    emit(
      picked === String(i) ? 'NUM' : picked.toUpperCase(),
      `${i} → ${picked}`,
      caption,
      { i, by15, by3, by5, picked },
      tone,
    );
  }

  emit(
    'DONE',
    `${n} printed`,
    `Every number from 1 to ${n} has been classified and placed. The output array holds ${n} strings — that is the complete FizzBuzz sequence.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FizzBuzzState>) {
  const s = frame.state;
  const display: (string | number)[] = s.out.map((v) => (v === '' ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i - 1, label: 'i', tone: 'accent', place: 'above' });
  const tone = (idx: number) => {
    if (s.i !== null && idx === s.i - 1) return 'found';
    return s.out[idx]! !== '' ? 'match' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · index i shown as its 1-based number
      </div>
      <ArrayRow
        values={display}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={(idx) => idx + 1}
      />
      {s.i !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          i = <span className="text-ink">{s.i}</span>
          {'  '}·{'  '}%15={s.by15 ? '0' : '≠0'}
          {'  '}%3={s.by3 ? '0' : '≠0'}
          {'  '}%5={s.by5 ? '0' : '≠0'}
          {s.picked !== null && (
            <>
              {'  '}→ <span className="text-ink">{s.picked}</span>
            </>
          )}
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>[{s.out.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FizzBuzzState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const filled = s.out.filter((v) => v !== '').length;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="i % 15 == 0" v={s.by15 === null ? '—' : s.by15 ? 'true' : 'false'} />
      <InspectorRow k="i % 3 == 0" v={s.by3 === null ? '—' : s.by3 ? 'true' : 'false'} />
      <InspectorRow k="i % 5 == 0" v={s.by5 === null ? '—' : s.by5 ? 'true' : 'false'} />
      <InspectorRow k="printed" v={s.picked ?? '—'} />
      <InspectorRow k="filled / n" v={`${filled} / ${s.n}`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-fizzbuzz';
export const title = 'Fizzbuzz';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Fizzbuzz"?',
    choices: [
      {
        label: 'FizzBuzz conditional — fits this problem',
        correct: true,
      },
      {
        label: 'Primality trial division — different approach',
      },
      {
        label: 'Fibonacci iterative — different approach',
      },
      {
        label: 'Greedy (last occurrence) — different approach',
      },
    ],
    explain: 'Check %15 first, then %3, then %5',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Fizzbuzz), what strategy is established?',
    choices: [
      {
        label: 'Check %15 first, then %3, then — described in INIT caption',
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
      'FizzBuzz: for every number 1.. we print "FizzBuzz" if it is divisible by 15, else "Fizz" if divisible by 3, else "Buzz" if divisible by 5, otherwise the number itself. Order matters — the 15 check must come first.',
  },
  {
    id: 'state',
    prompt: 'What does the `out` field track in the visualization state?',
    choices: [
      {
        label: "filled results so far; '' — updated each frame",
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
    explain: "The recorder keeps `out` in sync: filled results so far; '' = not filled yet",
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Fizzbuzz"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(log x) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). 15 FizzBuzz; 3 Fizz; 5 Buzz; else the number',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every number from 1 — final DONE caption',
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
      'Every number from 1 to  has been classified and placed. The output array holds  strings — that is the complete FizzBuzz sequence.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'fb5', label: 'n = 5', value: { n: 5 } },
    { id: 'fb8', label: 'n = 8', value: { n: 8 } },
  ] satisfies SampleInput<FizzBuzzInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FizzBuzzState | undefined;
    if (!s) return { ok: false, label: 'no output' };
    return { ok: true, label: `[${s.out.join(', ')}]` };
  },
};
