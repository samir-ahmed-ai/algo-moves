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

interface Base26Input {
  n: number;
}

interface Base26State {
  n0: number; // the original number being encoded
  n: number; // current working value of n as we chip off digits
  digits: string[]; // letters produced so far, in the order emitted (least-significant first)
  rem: number | null; // most recent n % 26 remainder
  letter: string | null; // most recent letter emitted
  reversed: boolean; // whether digits now hold the final left-to-right order
  result: string | null; // final encoded string once done
  done: boolean;
}

function record({ n }: Base26Input): Frame<Base26State>[] {
  const digits: string[] = [];
  let cur = n;

  const { emit, frames } = createPrepRecorder<Base26State>(() => ({
    n0: n,
    n: cur,
    digits: digits.slice(),
    rem: null,
    letter: null,
    reversed: false,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Base-26 (Excel-column) encoding of n = ${n}. This is a bijective base 26 where A=1..Z=26 and there is no zero digit, so each step decrements n by 1 before taking n % 26. We peel off one letter per step, least-significant first, then reverse.`,
    {},
  );

  if (n <= 0) {
    emit(
      'DONE',
      'empty',
      `n = ${n} is not a positive column number, so the encoding is the empty string.`,
      { result: '', reversed: true, done: true },
      'bad',
    );
    return frames;
  }

  while (cur > 0) {
    const before = cur;
    cur -= 1;
    emit(
      'DECR',
      `n=${before}→${cur}`,
      `Decrement first: n = ${before} − 1 = ${cur}. The −1 shifts the range so remainder 0 maps to 'A' (making the encoding bijective, with no zero digit).`,
      { n: cur },
    );

    const rem = cur % 26;
    const letter = String.fromCharCode('A'.charCodeAt(0) + rem);
    digits.push(letter);
    emit(
      'DIGIT',
      `${rem}→${letter}`,
      `Take the least-significant base-26 digit: ${cur} % 26 = ${rem}, which is the letter '${letter}' ('A' + ${rem}). Append it to the output buffer.`,
      { n: cur, rem, letter },
    );

    const next = Math.floor(cur / 26);
    emit(
      'DIV',
      `n=${cur}/26=${next}`,
      `Divide down to move to the next-higher digit: n = ⌊${cur} / 26⌋ = ${next}. ${next > 0 ? 'Still positive, so keep peeling letters.' : 'Now zero, so the loop stops.'}`,
      { n: next },
    );
    cur = next;
  }

  digits.reverse();
  const result = digits.join('');
  emit(
    'REVERSE',
    result,
    `Letters were produced least-significant first, so reverse the buffer to read the number left-to-right. The result is "${result}".`,
    { reversed: true, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<Base26State>) {
  const s = frame.state;
  const cells = s.digits.length > 0 ? s.digits : [' '];
  const pointers: ArrayPointer[] = [];
  if (!s.reversed && s.digits.length > 0) {
    pointers.push({ i: s.digits.length - 1, label: 'new', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.digits.length === 0) return '';
    if (s.reversed) return 'found';
    return i === s.digits.length - 1 ? 'match' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n0}</span>
        {' · '}remaining = <span className="font-mono text-ink">{s.n}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.reversed ? 'order = left → right (final)' : 'order = least-significant first'}
      </div>
      {s.rem !== null && s.letter !== null && !s.reversed && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink2')}>
          {s.n} % 26 = {s.rem} → '{s.letter}'
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.result}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<Base26State>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (input)" v={s.n0} />
      <InspectorRow k="n (working)" v={s.n} />
      <InspectorRow k="n % 26" v={s.rem ?? '—'} />
      <InspectorRow k="letter" v={s.letter ? `'${s.letter}'` : '—'} />
      <InspectorRow k="buffer" v={s.digits.length > 0 ? s.digits.join('') : '—'} />
      <InspectorRow k="result" v={s.result !== null ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

function encode(n: number): string {
  if (n <= 0) return '';
  const out: string[] = [];
  let cur = n;
  while (cur > 0) {
    cur -= 1;
    out.push(String.fromCharCode('A'.charCodeAt(0) + (cur % 26)));
    cur = Math.floor(cur / 26);
  }
  out.reverse();
  return out.join('');
}

export const manifestId = 'prep-math-base-26-encoding';
export const title = 'Base 26 encoding';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Base 26 encoding"?',
    choices: [
      {
        label: 'Bijective base-26 encoding — fits this problem',
        correct: true,
      },
      {
        label: 'Digit reversal — different approach',
      },
      {
        label: 'XOR + popcount — different approach',
      },
      {
        label: 'Grade-school multiplication — different approach',
      },
    ],
    explain: 'Excel columns: A=1..Z=26, then AA; decrement before each mod',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Base 26 encoding), what strategy is established?',
    choices: [
      {
        label: 'Excel columns: A=1..Z=26, then AA; — described in INIT caption',
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
      'Base-26 (Excel-column) encoding of n = . This is a bijective base 26 where A=1..Z=26 and there is no zero digit, so each step decrements n by 1 before taking n % 26. We peel off one letter per step, least-significant first, then reverse.',
  },
  {
    id: 'key-step',
    prompt: 'On the "DIGIT" step (→), what happens?',
    choices: [
      {
        label: 'Take the least-significant base-26 digit: — this move caption',
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
      "Take the least-significant base-26 digit:  % 26 = , which is the letter '' ('A' + ). Append it to the output buffer.",
  },
  {
    id: 'state',
    prompt: 'What does the `n0` field track in the visualization state?',
    choices: [
      {
        label: 'the original number being encoded — updated each frame',
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
    explain: 'The recorder keeps `n0` in sync: the original number being encoded',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Base 26 encoding"?',
    choices: [
      {
        label: 'O(log n) time, O(log n) space — standard bounds here',
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
    explain: "O(log n). O(log n). while n>0: n--; out+='A'+n%26; n/=26; reverse",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Divide down to move — final DONE caption',
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
    explain: 'Divide down to move to the next-higher digit: n = ⌊ / 26⌋ = . ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'b26a', label: 'n = 28 → AB', value: { n: 28 } },
    { id: 'b26b', label: 'n = 701 → ZY', value: { n: 701 } },
  ] satisfies SampleInput<Base26Input>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as Base26State | undefined;
    const answer = s ? encode(s.n0) : '';
    return answer ? { ok: true, label: `"${answer}"` } : { ok: false, label: 'empty' };
  },
};
