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

interface WordsInput {
  num: number;
}

interface Chunk {
  value: number; // the 3-digit group (0..999)
  scale: string; // '', 'Thousand', 'Million', 'Billion'
  words: string; // english words for this chunk (without scale)
}

interface WordsState {
  num: number;
  chunks: Chunk[]; // groups of 3 digits, index 0 = least significant (ones)
  active: number | null; // chunk index currently being processed
  remaining: number; // what is left of num to peel apart
  parts: string[]; // finished chunk strings, most-significant first
  result: string; // running joined answer
  done: boolean;
}

const BELOW20 = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const THOUSANDS = ['', 'Thousand', 'Million', 'Billion'];

// helper(n): english words for a 3-digit group (0..999), no trailing scale.
function helper(n: number): string {
  if (n === 0) return '';
  if (n < 20) return BELOW20[n];
  if (n < 100) {
    let r = TENS[Math.floor(n / 10)];
    if (n % 10 > 0) r += ' ' + BELOW20[n % 10];
    return r;
  }
  let r = BELOW20[Math.floor(n / 100)] + ' Hundred';
  if (n % 100 > 0) r += ' ' + helper(n % 100);
  return r;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const parts: string[] = [];
  let idx = 0;
  let n = num;
  while (n > 0) {
    if (n % 1000 !== 0) {
      let s = helper(n % 1000);
      if (THOUSANDS[idx] !== '') s += ' ' + THOUSANDS[idx];
      parts.unshift(s);
    }
    n = Math.floor(n / 1000);
    idx++;
  }
  return parts.join(' ');
}

function record({ num }: WordsInput): Frame<WordsState>[] {
  // Pre-split into 3-digit chunks so the board can show every group at once.
  const chunks: Chunk[] = [];
  {
    let n = num;
    let idx = 0;
    while (n > 0) {
      const value = n % 1000;
      chunks.push({ value, scale: THOUSANDS[idx], words: helper(value) });
      n = Math.floor(n / 1000);
      idx++;
    }
    if (chunks.length === 0) chunks.push({ value: 0, scale: '', words: '' });
  }

  const { emit, frames } = createRecorder<WordsState>(() => ({
    num,
    chunks,
    active: null,
    remaining: num,
    parts: [],
    result: '',
    done: false,
  }));

  emit(
    'INIT',
    `num=${num}`,
    `Integer to English Words: read ${num} out loud. The trick is to chop the number into 3-digit groups from the right — ones, then Thousand, Million, Billion — name each group, then glue the scale words back on.`,
    {},
  );

  if (num === 0) {
    emit(
      'ZERO',
      'Zero',
      `The number is 0. That is the one special case — there are no non-zero groups, so the answer is simply "Zero".`,
      { result: 'Zero', done: true },
      'good',
    );
    return frames;
  }

  const parts: string[] = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    const c = chunks[idx];
    const remaining = Math.floor(num / Math.pow(1000, idx));
    emit(
      'CHUNK',
      `group ${idx}=${c.value}`,
      `Take group ${idx} (the ${idx === 0 ? 'ones' : THOUSANDS[idx].toLowerCase()} group): num % 1000 gives the low three digits = ${c.value}.`,
      { active: idx, remaining, parts: parts.slice() },
    );

    if (c.value === 0) {
      emit(
        'SKIP',
        `group ${idx} empty`,
        `Group ${idx} is 000, so it contributes nothing to the phrase. Skip it and move to the next group.`,
        { active: idx, remaining, parts: parts.slice() },
      );
      continue;
    }

    let s = c.words;
    emit(
      'NAME',
      `"${s}"`,
      `Name the 3-digit group ${c.value} with the lookup helper: ${c.value} → "${s}". Hundreds use below-20 + "Hundred"; the last two digits use the tens/below-20 tables.`,
      { active: idx, remaining, parts: parts.slice() },
    );

    if (c.scale !== '') {
      s += ' ' + c.scale;
      emit(
        'SCALE',
        `+ ${c.scale}`,
        `This group sits in the ${c.scale} place, so append the scale word: "${s}".`,
        { active: idx, remaining, parts: parts.slice() },
      );
    }

    // Bigger groups come first in the final phrase, so prepend.
    parts.unshift(s);
    emit(
      'PREPEND',
      `parts=${parts.length}`,
      `More-significant groups are spoken first, so put "${s}" at the front of the phrase. Running phrase: "${parts.join(' ')}".`,
      { active: idx, remaining, parts: parts.slice(), result: parts.join(' ') },
    );
  }

  const answer = parts.join(' ');
  emit(
    'DONE',
    answer,
    `Every group has been named and glued together from most to least significant. ${num} spelled out is "${answer}". Time O(1), Space O(1) — the number has a bounded 4 groups.`,
    { active: null, parts: parts.slice(), result: answer, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordsState>) {
  const s = frame.state;
  // Render chunks least-significant on the LEFT is confusing; show most-significant
  // first (as spoken), so reverse the chunk array for display.
  const display = s.chunks.slice().reverse();
  const values = display.map((c) => String(c.value).padStart(3, '0'));
  const activeDisplay = s.active === null ? null : display.length - 1 - s.active;
  const pointers: ArrayPointer[] = [];
  if (activeDisplay !== null) {
    pointers.push({ i: activeDisplay, label: 'group', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    const c = display[i];
    if (activeDisplay === i) return 'match';
    if (c.value === 0) return 'dead';
    return 'in-window';
  };
  const scaleLabel = (i: number) => (display[i].scale === '' ? 'ones' : display[i].scale);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        num = <span className="font-mono text-ink">{s.num.toLocaleString()}</span>
      </div>
      <ArrayRow
        values={values}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={scaleLabel}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.active !== null && s.chunks[s.active] ? (
          <>
            group {s.active} ({String(s.chunks[s.active].value).padStart(3, '0')}) →{' '}
            <span className="text-ink">{s.chunks[s.active].words || '—'}</span>
            {s.chunks[s.active].scale ? ` ${s.chunks[s.active].scale}` : ''}
          </>
        ) : (
          'index = 3-digit group, label = scale'
        )}
      </div>
      <div
        className={cn(
          'mt-1 font-mono',
          s.done ? 'text-good' : 'text-ink',
          s.done ? vizText.base : vizText.sm,
        )}
      >
        {s.result ? `→ ${s.result}` : 'phrase: …'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const c = s.active !== null ? s.chunks[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="num" v={s.num.toLocaleString()} />
      <InspectorRow k="groups" v={s.chunks.length} />
      <InspectorRow k="active group" v={s.active ?? '—'} />
      <InspectorRow k="group value" v={c ? c.value : '—'} />
      <InspectorRow k="group words" v={c ? c.words || '—' : '—'} />
      <InspectorRow k="scale" v={c ? c.scale || 'ones' : '—'} />
      <InspectorRow k="parts" v={s.parts.length} />
      <InspectorRow k="result" v={s.result ? s.result : s.done ? 'Zero' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-integer-to-english-words';
export const title = 'Integer to English Words';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Integer to English Words"?',
    choices: [
      {
        label: 'Chunk by 1000 + Lookup — fits this problem',
        correct: true,
      },
      {
        label: 'Digit reversal — different approach',
      },
      {
        label: 'FizzBuzz conditional — different approach',
      },
      {
        label: 'Grade-school multiplication — different approach',
      },
    ],
    explain: 'See Integer To English Words pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Integer to English Words), what strategy is established?',
    choices: [
      {
        label: 'See Integer To English Words pattern — described in INIT caption',
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
      'Integer to English Words: read  out loud. The trick is to chop the number into 3-digit groups from the right — ones, then Thousand, Million, Billion — name each group, then glue the scale words back on.',
  },
  {
    id: 'key-step',
    prompt: 'On the "NAME" step (""), what happens?',
    choices: [
      {
        label: 'Name the 3-digit group — this move caption',
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
      'Name the 3-digit group  with the lookup helper:  → "". Hundreds use below-20 + "Hundred"; the last two digits use the tens/below-20 tables.',
  },
  {
    id: 'state',
    prompt: 'What does the `chunks` field track in the visualization state?',
    choices: [
      {
        label: 'groups of 3 digits, index — updated each frame',
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
    explain:
      'The recorder keeps `chunks` in sync: groups of 3 digits, index 0 = least significant (ones)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Integer to English Words"?',
    choices: [
      {
        label: 'O(1) time, O(1) space — standard bounds here',
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
    explain: 'O(1). O(1). Integer To English Words',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'More-significant groups are spoken first — final DONE caption',
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
      'More-significant groups are spoken first, so put "" at the front of the phrase. Running phrase: "".',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'iew1', label: '1234567', value: { num: 1234567 } },
    { id: 'iew2', label: '1000010', value: { num: 1000010 } },
  ] satisfies SampleInput<WordsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordsState | undefined;
    const expected = s ? numberToWords(s.num) : '';
    const got = s ? s.result || (s.num === 0 ? 'Zero' : '') : '';
    return { ok: got === expected && got.length > 0, label: got || '—' };
  },
};
