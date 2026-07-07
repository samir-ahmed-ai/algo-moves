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

interface DifferInput {
  dict: string[];
}

interface DifferState {
  dict: string[];
  L: number; // shared word length
  col: number | null; // wildcard column being processed
  wordIdx: number | null; // index of the current word within dict
  pattern: string | null; // wildcard key for the current word at this column
  seen: string[]; // wildcard keys seen so far in this column
  matchWord: number | null; // earlier word index whose key collided
  result: boolean | null; // true = found a differ-by-one pair; false = none
  done: boolean;
}

function wildcard(word: string, col: number): string {
  return word.slice(0, col) + '*' + word.slice(col + 1);
}

function record({ dict }: DifferInput): Frame<DifferState>[] {
  const L = dict.length === 0 ? 0 : dict[0].length;

  const { emit, frames } = createRecorder<DifferState>(() => ({
    dict,
    L,
    col: null,
    wordIdx: null,
    pattern: null,
    seen: [],
    matchWord: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${dict.length} words · len ${L}`,
    `Strings Differ by One Character: is there a pair of words that match everywhere except at exactly one position? For each column we blank that column with "*"; two words sharing the same blanked key differ only at that column.`,
    {},
  );

  if (dict.length === 0) {
    emit(
      'DONE',
      'empty dict',
      `The dictionary is empty, so there is no pair to compare. Answer: false.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  for (let col = 0; col < L; col++) {
    const seen = new Set<string>();
    const seenOwner = new Map<string, number>();
    emit(
      'COLUMN',
      `col ${col}`,
      `Sweep column ${col}: replace character ${col} of every word with "*" and collect the resulting keys. A repeated key means two words are identical apart from column ${col}.`,
      { col },
    );

    for (let w = 0; w < dict.length; w++) {
      const p = wildcard(dict[w], col);
      const seenList = [...seen];
      if (seen.has(p)) {
        const owner = seenOwner.get(p)!;
        emit(
          'FOUND',
          `${p}`,
          `Word ${w} ("${dict[w]}") makes key "${p}", which word ${owner} ("${dict[owner]}") already produced this column. They agree everywhere except column ${col}, so they differ by exactly one character. Answer: true.`,
          {
            col,
            wordIdx: w,
            pattern: p,
            seen: seenList,
            matchWord: owner,
            result: true,
            done: true,
          },
          'good',
        );
        return frames;
      }
      emit(
        'STORE',
        `${p}`,
        `Word ${w} ("${dict[w]}") blanks column ${col} to key "${p}". It is new for this column, so remember it and continue.`,
        { col, wordIdx: w, pattern: p, seen: seenList },
      );
      seen.add(p);
      seenOwner.set(p, w);
    }
  }

  emit(
    'DONE',
    'no pair',
    `Every column was swept with no repeated wildcard key, so no two words differ by exactly one character. Answer: false.`,
    { result: false, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DifferState>) {
  const s = frame.state;
  const chars = s.wordIdx !== null ? s.dict[s.wordIdx].split('') : (s.dict[0] ?? '').split('');
  const pointers: ArrayPointer[] = [];
  if (s.col !== null) pointers.push({ i: s.col, label: '*', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.col === i ? 'match' : '');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        column = <span className="font-mono text-ink">{s.col ?? '—'}</span>
        {s.wordIdx !== null && (
          <>
            {' · '}word {s.wordIdx} ={' '}
            <span className="font-mono text-ink">"{s.dict[s.wordIdx]}"</span>
          </>
        )}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.pattern !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.matchWord !== null ? 'text-good' : 'text-ink',
          )}
        >
          key = "{s.pattern}"
          {s.matchWord !== null && <span className="text-good"> ← matches word {s.matchWord}</span>}
        </div>
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        seen {'{'}
        {s.seen.map((k) => `"${k}"`).join(', ')}
        {'}'}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', s.result ? 'text-good' : 'text-bad', vizText.base)}>
          → {s.result ? 'true' : 'false'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DifferState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="words" v={s.dict.length} />
      <InspectorRow k="word length L" v={s.L} />
      <InspectorRow k="column" v={s.col ?? '—'} />
      <InspectorRow k="word idx" v={s.wordIdx ?? '—'} />
      <InspectorRow k="key" v={s.pattern !== null ? `"${s.pattern}"` : '—'} />
      <InspectorRow k="seen (col)" v={s.seen.length} />
      <InspectorRow k="collides with" v={s.matchWord ?? '—'} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-strings-differ-by-one-character';
export const title = 'Strings Differ by One Character';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Strings Differ by One Character"?',
    choices: [
      {
        label: 'Wildcard Hash Set — fits this problem',
        correct: true,
      },
      {
        label: 'Double string trick — different approach',
      },
      {
        label: 'Frequency map — different approach',
      },
      {
        label: 'Stack of unmatched indices — different approach',
      },
    ],
    explain: 'See Strings Differ By One Character pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Strings Differ by One Character), what strategy is established?',
    choices: [
      {
        label: 'See Strings Differ By One Character — described in INIT caption',
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
      'Strings Differ by One Character: is there a pair of words that match everywhere except at exactly one position? For each column we blank that column with "*"; two words sharing the same blanked key differ only at that column.',
  },
  {
    id: 'key-step',
    prompt: 'On the "FOUND" step (), what happens?',
    choices: [
      {
        label: 'Word ("") makes key "", which — this move caption',
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
      'Word  ("") makes key "", which word  ("") already produced this column. They agree everywhere except column , so they differ by exactly one character. Answer: true.',
  },
  {
    id: 'state',
    prompt: 'What does the `L` field track in the visualization state?',
    choices: [
      {
        label: 'shared word length — updated each frame',
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
    explain: 'The recorder keeps `L` in sync: shared word length',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Strings Differ by One Character"?',
    choices: [
      {
        label: 'O(n·L) time, O(n·L) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n*k) time, O(n*k) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n·L). O(n·L). Strings Differ By One Character',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Word ("") blanks column to key — final DONE caption',
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
      'Word  ("") blanks column  to key "". It is new for this column, so remember it and continue.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sdoc1', label: '[abcd, acbd, aacd]', value: { dict: ['abcd', 'acbd', 'aacd'] } },
    { id: 'sdoc2', label: '[ab, cd, yz]', value: { dict: ['ab', 'cd', 'yz'] } },
  ] satisfies SampleInput<DifferInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DifferState | undefined;
    return s?.result
      ? { ok: true, label: 'true — differ by one' }
      : { ok: false, label: 'false — no pair' };
  },
};
