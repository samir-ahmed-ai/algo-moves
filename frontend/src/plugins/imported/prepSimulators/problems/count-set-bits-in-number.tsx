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
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';
import { toBitStrings } from '../../../_shared/bitUtils';

interface CountBitsInput {
  n: number;
  /** Number of bit columns to render (most-significant first). */
  width: number;
}

interface CountBitsState {
  width: number;
  original: number; // the number we started with (for the header)
  bits: string[]; // current value's bits, MSB-first, as '0' / '1'
  cur: number; // current value of n during the loop
  lowIndex: number | null; // array index (MSB-first) of the lowest set bit being cleared
  count: number; // set bits counted so far
  done: boolean;
}

/** MSB-first bit array of length `width` for a non-negative integer. */

/** Array index (MSB-first) of the lowest set bit, or null if value is 0. */
function lowestSetIndex(value: number, width: number): number | null {
  if (value === 0) return null;
  let b = 0;
  while (((value >> b) & 1) === 0) b++;
  return width - 1 - b;
}

function record({ n, width }: CountBitsInput): Frame<CountBitsState>[] {
  const { emit, frames } = createRecorder<CountBitsState>(() => ({
    width: width,
    original: n,
    bits: toBitStrings(n, width),
    cur: n,
    lowIndex: null,
    count: 0,
    done: false,
  }));

  let cur = n;
  let count = 0;

  emit(
    'INIT',
    `n=${n}`,
    `Count the set (1) bits in ${n} using Brian Kernighan's trick: n & (n − 1) clears the lowest set bit. Each time we do that, we've removed exactly one 1, so we count one loop per set bit.`,
    {
      bits: toBitStrings(cur, width),
      lowIndex: lowestSetIndex(cur, width),
      count: count,
      done: false,
    },
  );

  // for n != 0 { n &= n - 1; count++ }
  while (cur !== 0) {
    const low = lowestSetIndex(cur, width);
    emit(
      'SELECT',
      `low bit @2^${width - 1 - (low ?? 0)}`,
      `n = ${cur} is not 0, so at least one bit is set. Its lowest 1 is the highlighted bit. Applying n &= n − 1 will flip exactly that bit to 0.`,
      { bits: toBitStrings(cur, width), lowIndex: low, count: count, done: false },
    );

    const next = cur & (cur - 1);
    count++;
    emit(
      'CLEAR',
      `n=${next}, count=${count}`,
      `n & (n − 1) = ${cur} & ${cur - 1} = ${next}: the lowest 1 is gone. Increment count to ${count}. Continue while n is still non-zero.`,
      {
        bits: toBitStrings(next, width),
        lowIndex: lowestSetIndex(next, width),
        count: count,
        done: false,
      },
      'good',
    );
    cur = next;
  }

  emit(
    'DONE',
    `${count} set bits`,
    `n has reached 0, so every 1 bit has been cleared and counted. ${n} has ${count} set bit${count === 1 ? '' : 's'}. Time O(bits set), Space O(1).`,
    { bits: toBitStrings(0, width), lowIndex: null, count: count, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<CountBitsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lowIndex !== null) {
    pointers.push({ i: s.lowIndex, label: 'low', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.lowIndex === i) return 'match';
    return s.bits[i] === '1' ? 'in-window' : '';
  };
  // Show the power-of-two exponent under each column instead of the raw index.
  const powerLabel = (i: number) => 2 ** (s.width - 1 - i);
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="n" v={s.cur} tone={s.cur === 0 ? 'bad' : 'accent'} />
        <RailStat k="count" v={s.count} tone={s.count > 0 ? 'good' : undefined} />
      </RailGroup>
      {s.done && <RailResult label="set bits" value={s.count} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow
        values={s.bits}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={powerLabel}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CountBitsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="original n" v={s.original} />
      <InspectorRow k="n (current)" v={s.cur} />
      <InspectorRow k="n binary" v={s.bits.join('')} />
      <InspectorRow
        k="lowest set bit"
        v={s.lowIndex !== null ? 2 ** (s.width - 1 - s.lowIndex) : '—'}
      />
      <InspectorRow k="count" v={s.count} />
      <InspectorRow k="status" v={s.done ? 'done' : s.cur === 0 ? 'zero' : 'looping'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-count-set-bits-in-number';
export const title = 'Count set bits in number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Count set bits in number"?',
    choices: [
      {
        label: 'Brian Kernighan bit count — fits this problem',
        correct: true,
      },
      {
        label: 'Greedy — different approach',
      },
      {
        label: 'Big integer string addition — different approach',
      },
      {
        label: 'Binary search sqrt — different approach',
      },
    ],
    explain: 'n & (n-1) drops the lowest 1 each iteration',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Count set bits in number), what strategy is established?',
    choices: [
      {
        label: 'n & (n-1) drops the lowest — described in INIT caption',
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
      "Count the set (1) bits in  using Brian Kernighan's trick: n & (n − 1) clears the lowest set bit. Each time we do that, we've removed exactly one 1, so we count one loop per set bit.",
  },
  {
    id: 'key-step',
    prompt: 'On the "CLEAR" step (n=, count=), what happens?',
    choices: [
      {
        label: 'n & (n − 1) = — this move caption',
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
      'n & (n − 1) =  &  = : the lowest 1 is gone. Increment count to . Continue while n is still non-zero.',
  },
  {
    id: 'state',
    prompt: 'What does the `original` field track in the visualization state?',
    choices: [
      {
        label: 'the number we started — updated each frame',
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
    explain: 'The recorder keeps `original` in sync: the number we started with (for the header)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Count set bits in number"?',
    choices: [
      {
        label: 'O(bits set) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) worst case time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(bits set). O(1). count=0; while n!=0 { n&=n-1; count++ }',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'n has reached 0, so every — final DONE caption',
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
      'n has reached 0, so every 1 bit has been cleared and counted.  has  set bit. Time O(bits set), Space O(1).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'csb1', label: 'n = 13 (1101)', value: { n: 13, width: 8 } },
    { id: 'csb2', label: 'n = 23 (10111)', value: { n: 23, width: 8 } },
  ] satisfies SampleInput<CountBitsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CountBitsState | undefined;
    const count = s?.count ?? 0;
    return { ok: true, label: `${count} set bit${count === 1 ? '' : 's'}` };
  },
};
