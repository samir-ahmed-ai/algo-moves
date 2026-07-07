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

interface ShortestWayInput {
  source: string;
  target: string;
}

interface ShortestWayState {
  source: string;
  target: string;
  i: number | null; // pointer scanning source
  j: number | null; // pointer into target (chars 0..j-1 already formed)
  res: number; // subsequences used so far
  passStart: number | null; // value of j at the start of the current pass
  matchedInPass: boolean; // did this pass advance j at all?
  answer: number | null; // final result: count, or -1 if impossible
  done: boolean;
}

function record({ source, target }: ShortestWayInput): Frame<ShortestWayState>[] {
  const { emit, frames } = createRecorder<ShortestWayState>(() => ({
    source,
    target,
    i: null,
    j: null,
    res: 0,
    passStart: null,
    matchedInPass: false,
    answer: null,
    done: false,
  }));

  let res = 0;
  let j = 0;

  emit(
    'INIT',
    `"${source}" → "${target}"`,
    `Shortest Way to Form String: build target "${target}" by concatenating subsequences of source "${source}". Greedily sweep source left-to-right, matching as many target chars as possible per pass; each full sweep costs one subsequence.`,
    { j: 0, res: 0 },
  );

  while (j < target.length) {
    const prev = j;
    res++;
    emit(
      'PASS',
      `pass ${res}`,
      `Start subsequence #${res}. Sweep source from the left, advancing through target for every character that matches in order. j is at ${j} ("${target[j]}").`,
      { j, res, passStart: prev, i: null },
    );

    for (let i = 0; i < source.length && j < target.length; i++) {
      if (source[i] === target[j]) {
        emit(
          'MATCH',
          `source[${i}]='${source[i]}'`,
          `source[${i}] = '${source[i]}' matches target[${j}] = '${target[j]}'. Consume it: advance j to ${j + 1}. That target character is now formed by this subsequence.`,
          { i, j, res, passStart: prev, matchedInPass: true },
          'good',
        );
        j++;
      } else {
        emit(
          'SKIP',
          `source[${i}]='${source[i]}'`,
          `source[${i}] = '${source[i]}' does not equal target[${j}] = '${target[j]}'. Skip this source character and keep scanning; j stays at ${j}.`,
          { i, j, res, passStart: prev, matchedInPass: j > prev },
        );
      }
    }

    if (j === prev) {
      emit(
        'FAIL',
        'no progress',
        `A whole sweep of source matched no new target character (j stayed at ${prev}). target[${prev}] = '${target[prev]}' never appears in source, so target can never be formed. Return -1.`,
        { j, res, passStart: prev, matchedInPass: false, answer: -1, done: true },
        'bad',
      );
      return frames;
    }

    emit(
      'ENDPASS',
      `res=${res}`,
      `Subsequence #${res} finished, having formed target[${prev}..${j - 1}]. ${
        j < target.length
          ? `Still need "${target.slice(j)}", so start another pass.`
          : 'All of target is now formed.'
      }`,
      { j, res, passStart: prev, matchedInPass: true, i: null },
    );
  }

  emit(
    'DONE',
    `${res} subsequences`,
    `target "${target}" is fully formed using ${res} subsequence${res === 1 ? '' : 's'} of source. Answer = ${res}.`,
    { j, res, answer: res, done: true },
    'good',
  );
  return frames;
}

function SourceRow({ s }: { s: ShortestWayState }) {
  const chars = s.source.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  return (
    <div>
      <div className={cn('mb-1', vizText.sm, 'text-ink3')}>
        source <span className="font-mono text-ink">"{s.source}"</span>
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
    </div>
  );
}

function TargetRow({ s }: { s: ShortestWayState }) {
  const chars = s.target.split('');
  const formed = s.j ?? 0;
  const pointers: ArrayPointer[] = [];
  if (s.j !== null && s.j < chars.length) {
    pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'below' });
  }
  const tone = (i: number) => (i < formed ? 'found' : i === s.j ? 'match' : '');
  return (
    <div className="mt-3">
      <div className={cn('mb-1', vizText.sm, 'text-ink3')}>
        target <span className="font-mono text-ink">"{s.target}"</span> · formed{' '}
        <span className="font-mono text-ink">{formed}</span>/{chars.length}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
    </div>
  );
}

function View({ frame }: PluginViewProps<ShortestWayState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn('mb-2', vizText.sm, 'text-ink3')}>
        subsequences used = <span className="font-mono text-ink">{s.res}</span>
      </div>
      <SourceRow s={s} />
      <TargetRow s={s} />
      {s.answer !== null && (
        <div
          className={cn('mt-3 font-mono', vizText.base, s.answer === -1 ? 'text-bad' : 'text-good')}
        >
          → {s.answer === -1 ? 'impossible (-1)' : `${s.answer}`}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ShortestWayState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const sourceCh = s.i !== null ? s.source[s.i] : '—';
  const targetCh = s.j !== null && s.j < s.target.length ? s.target[s.j] : '—';
  return (
    <VarGrid>
      <InspectorRow k="source" v={`"${s.source}"`} />
      <InspectorRow k="target" v={`"${s.target}"`} />
      <InspectorRow k="i (source)" v={s.i ?? '—'} />
      <InspectorRow k="source[i]" v={sourceCh} />
      <InspectorRow k="j (target)" v={s.j ?? '—'} />
      <InspectorRow k="target[j]" v={targetCh} />
      <InspectorRow k="res (subseq)" v={s.res} />
      <InspectorRow
        k="answer"
        v={s.answer === null ? (s.done ? '—' : '…') : s.answer === -1 ? '-1' : s.answer}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-shortest-way-to-form-string';
export const title = 'Shortest Way to Form String';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Shortest Way to Form String"?',
    choices: [
      {
        label: 'Two Pointers Greedy — fits this problem',
        correct: true,
      },
      {
        label: 'Index Map — different approach',
      },
      {
        label: 'Counter — different approach',
      },
      {
        label: 'Two Pointers — different approach',
      },
    ],
    explain: 'See Shortest Way To Form String pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Shortest Way to Form String), what strategy is established?',
    choices: [
      {
        label: 'See Shortest Way To Form String — described in INIT caption',
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
      'Shortest Way to Form String: build target "" by concatenating subsequences of source "". Greedily sweep source left-to-right, matching as many target chars as possible per pass; each full sweep costs one subsequence.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step (source[]=\'\'), what happens?',
    choices: [
      {
        label: "source[] = '' does not equal — this move caption",
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
      "source[] = '' does not equal target[] = ''. Skip this source character and keep scanning; j stays at .",
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'pointer scanning source — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: pointer scanning source',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Shortest Way to Form String"?',
    choices: [
      {
        label: 'O( time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O( time, O(words) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(. O(1). Shortest Way To Form String',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'target "" is fully formed using — final DONE caption',
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
    explain: 'target "" is fully formed using  subsequence of source. Answer = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sw1', label: '"abc" → "abcbc"', value: { source: 'abc', target: 'abcbc' } },
    { id: 'sw2', label: '"xyz" → "xzyxz"', value: { source: 'xyz', target: 'xzyxz' } },
  ] satisfies SampleInput<ShortestWayInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ShortestWayState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'incomplete' };
    return s.answer === -1
      ? { ok: false, label: 'impossible (-1)' }
      : { ok: true, label: `${s.answer} subsequences` };
  },
};
