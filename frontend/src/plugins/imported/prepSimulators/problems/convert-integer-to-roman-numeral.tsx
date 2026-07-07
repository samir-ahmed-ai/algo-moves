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

interface RomanInput {
  num: number;
}

interface RomanState {
  original: number; // the number we started with
  num: number; // remaining amount still to convert
  values: number[]; // greedy value table (fixed)
  symbols: string[]; // matching roman symbols (fixed)
  i: number | null; // current row in the table
  emitted: string | null; // symbol appended on this frame (if any)
  out: string; // roman numeral built so far
  done: boolean;
}

const VALUES = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
const SYMBOLS = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

function record({ num }: RomanInput): Frame<RomanState>[] {
  const original = num;
  let out = '';

  const { emit, frames } = createRecorder<RomanState>(() => ({
    original,
    num,
    values: VALUES,
    symbols: SYMBOLS,
    i: null,
    emitted: null,
    out,
    done: false,
  }));

  emit(
    'INIT',
    `num=${original}`,
    `Integer → Roman: greedily subtract the largest symbol value that still fits. We walk the value table (1000, 900, 500, 400, …, 1) once, and for each value repeatedly emit its symbol while it is ≤ the remaining number.`,
    {},
  );

  for (let i = 0; i < VALUES.length; i++) {
    const v = VALUES[i];
    const sym = SYMBOLS[i];
    emit(
      'CONSIDER',
      `${sym}=${v}`,
      `Look at symbol ${sym} = ${v}. Remaining number is ${num}. As long as ${num} ≥ ${v} we can append ${sym} and subtract ${v}.`,
      { i },
    );

    while (num >= v) {
      out += sym;
      num -= v;
      emit(
        'EMIT',
        `+${sym} → ${num}`,
        `${num + v} ≥ ${v}, so append ${sym} and subtract: ${num + v} − ${v} = ${num}. Result so far is "${out}".`,
        { i, emitted: sym },
        'good',
      );
    }

    if (num > 0) {
      emit(
        'SKIP',
        `${num} < ${v}`,
        `Now ${num} < ${v}, so ${sym} no longer fits. Move down to the next-smaller symbol.`,
        { i },
      );
    } else {
      emit(
        'DRAINED',
        `num=0`,
        `Remaining number is 0 — everything has been converted. The Roman numeral is complete: "${out}".`,
        { i, out, done: true },
        'good',
      );
      break;
    }
  }

  const last = frames[frames.length - 1];
  if (!last.state.done) {
    emit(
      'DONE',
      out || '(empty)',
      `Finished the value table. The Roman numeral for ${original} is "${out}".`,
      { done: true },
      'good',
    );
  }
  return frames;
}

function View({ frame }: PluginViewProps<RomanState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'v', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.i !== i) return '';
    if (s.emitted !== null) return 'found';
    return 'match';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        num = <span className="font-mono text-ink">{s.original}</span>
        {' · '}remaining = <span className="font-mono text-ink">{s.num}</span>
      </div>
      <ArrayRow
        values={s.symbols}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={(i) => s.values[i]}
      />
      <div className={cn(vizText.xs, 'text-ink3')}>row = symbol, label = its value</div>
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        {s.out === '' ? '·' : s.out}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RomanState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="num (input)" v={s.original} />
      <InspectorRow k="remaining" v={s.num} />
      <InspectorRow k="row i" v={s.i ?? '—'} />
      <InspectorRow k="value" v={s.i !== null ? s.values[s.i] : '—'} />
      <InspectorRow k="symbol" v={s.i !== null ? s.symbols[s.i] : '—'} />
      <InspectorRow k="result" v={s.out === '' ? '…' : s.out} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-convert-integer-to-roman-numeral';
export const title = 'Covert integer to roman numeral';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Covert integer to roman numeral"?',
    choices: [
      {
        label: 'Greedy roman numeral — fits this problem',
        correct: true,
      },
      {
        label: 'Bit trick power of two — different approach',
      },
      {
        label: 'Iterative factorial — different approach',
      },
      {
        label: 'Sort + Sliding Window (atan2) — different approach',
      },
    ],
    explain: 'Greedily subtract the largest symbol value that fits',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Covert integer to roman numeral), what strategy is established?',
    choices: [
      {
        label: 'Greedily subtract the largest symbol value — described in INIT caption',
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
      'Integer → Roman: greedily subtract the largest symbol value that still fits. We walk the value table (1000, 900, 500, 400, …, 1) once, and for each value repeatedly emit its symbol while it is ≤ the remaining number.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step ( < ), what happens?',
    choices: [
      {
        label: 'Now < , so no longer — this move caption',
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
    explain: 'Now  < , so  no longer fits. Move down to the next-smaller symbol.',
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
    explain: 'The recorder keeps `original` in sync: the number we started with',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Covert integer to roman numeral"?',
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
    explain: 'O(1). O(1). values/symbols incl 900,400,90,40,9,4; while num>=v emit symbol',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Remaining number is 0 — everything — final DONE caption',
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
      'Remaining number is 0 — everything has been converted. The Roman numeral is complete: "".',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'roman1', label: '1994 → MCMXCIV', value: { num: 1994 } },
    { id: 'roman2', label: '58 → LVIII', value: { num: 58 } },
  ] satisfies SampleInput<RomanInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RomanState | undefined;
    const label = s?.out ? s.out : '(empty)';
    return { ok: !!s?.done, label };
  },
};
