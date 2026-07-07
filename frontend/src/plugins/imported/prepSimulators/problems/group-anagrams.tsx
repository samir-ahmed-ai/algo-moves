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

interface GroupAnagramsInput {
  strs: string[];
}

interface GroupEntry {
  key: string;
  words: string[];
}

interface GroupAnagramsState {
  strs: string[];
  wi: number | null; // index of the word currently being processed
  word: string; // the word currently being processed (chars shown in ArrayRow)
  ci: number | null; // index of the character being counted into the signature
  key: string; // the signature (sorted letters) built so far for this word
  groups: GroupEntry[]; // buckets built so far, in insertion order
  hitKey: string | null; // key that just received the current word
  isNewGroup: boolean; // whether the current word started a fresh bucket
  done: boolean;
}

/** Signature = the word's letters sorted, mirroring the Go 26-count key. */
function signature(word: string): string {
  return word.split('').sort().join('');
}

function record({ strs }: GroupAnagramsInput): Frame<GroupAnagramsState>[] {
  const groups = new Map<string, string[]>();

  const snapshotGroups = (): GroupEntry[] =>
    [...groups.entries()].map(([key, words]) => ({ key, words: [...words] }));

  const { emit, frames } = createPrepRecorder<GroupAnagramsState>(() => ({
    strs,
    wi: null,
    word: '',
    ci: null,
    key: '',
    groups: snapshotGroups(),
    hitKey: null,
    isNewGroup: false,
    done: false,
  }));

  emit(
    'INIT',
    `${strs.length} words`,
    `Group anagrams: two words are anagrams when their letters match. We give each word a signature — its letters sorted — and bucket words that share a signature into the same group.`,
    {},
  );

  for (let wi = 0; wi < strs.length; wi++) {
    const word = strs[wi]!;

    emit(
      'PICK',
      `word "${word}"`,
      `Take word ${wi}: "${word}". Build its signature by sorting its ${word!.length} letters, so every anagram of it collapses to the same key.`,
      { wi, word, key: '' },
    );

    let partial = '';
    for (let ci = 0; ci < word!.length; ci++) {
      partial += word![ci];
      emit(
        'COUNT',
        `+${word![ci]}`,
        `Fold letter "${word![ci]}" (index ${ci}) into the signature. Collecting all letters of "${word}" so we can sort them into a canonical key.`,
        { wi, word, ci, key: partial },
      );
    }

    const key = signature(word!);
    const isNewGroup = !groups.has(key);
    emit(
      'KEY',
      `key "${key}"`,
      `Sorting the letters of "${word}" gives the signature "${key}". ${isNewGroup ? 'No bucket has this key yet.' : 'A bucket with this key already exists.'}`,
      { wi, word, key },
    );

    const bucket = groups.get(key) ?? [];
    bucket.push(word!);
    groups.set(key, bucket);
    emit(
      isNewGroup ? 'NEW_GROUP' : 'ADD',
      isNewGroup ? `new "${key}"` : `into "${key}"`,
      isNewGroup
        ? `Start a new group under "${key}" and drop "${word}" in. There are now ${groups.size} group(s).`
        : `"${word}" is an anagram of the words already under "${key}", so add it to that group.`,
      { wi, word, key, hitKey: key, isNewGroup },
      'good',
    );
  }

  emit(
    'DONE',
    `${groups.size} groups`,
    `Every word is bucketed. The map has ${groups.size} group(s) — that is the number of distinct anagram families among the input.`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<GroupAnagramsState>) {
  const s = frame.state;
  const chars: string[] = s.word ? s.word.split('') : [];
  const pointers: ArrayPointer[] = [];
  if (s.ci !== null) pointers.push({ i: s.ci, label: 'c', tone: 'accent', place: 'above' });
  const tone = (i: number): string => {
    if (s.ci === null) return s.word && s.key ? 'match' : '';
    return i < s.key.length ? 'match' : '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.wi !== null && !s.done ? (
          <>
            word <span className="font-mono text-ink">{s.wi}</span>
            {s.word && (
              <>
                {' · '}
                <span className="font-mono text-ink">&quot;{s.word}&quot;</span>
              </>
            )}
          </>
        ) : (
          <>
            words:{' '}
            <span className="font-mono text-ink">[{s.strs.map((w) => `"${w}"`).join(', ')}]</span>
          </>
        )}
      </div>

      {chars.length > 0 ? (
        <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('mt-1', vizText.xs, 'text-ink3')}>—</div>
      )}

      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        key ={' '}
        <span className={cn('text-ink', s.hitKey ? 'text-good' : undefined)}>
          {s.key ? `"${s.key}"` : '""'}
        </span>
      </div>

      <div className={cn('mt-2 font-mono', vizText.xs, 'text-ink3')}>
        {s.groups.length === 0 ? (
          <span>groups {'{}'}</span>
        ) : (
          s.groups.map((g) => (
            <div key={g.key} className={cn(g.key === s.hitKey ? 'text-good' : 'text-ink3')}>
              {`"${g.key}"`} → [{g.words.map((w) => `"${w}"`).join(', ')}]
            </div>
          ))
        )}
      </div>

      {s.done && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>
          → {s.groups.length} group{s.groups.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<GroupAnagramsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const totalWords = s.groups.reduce((acc, g) => acc + g.words.length, 0);
  return (
    <VarGrid>
      <InspectorRow k="word index" v={s.wi ?? '—'} />
      <InspectorRow k="word" v={s.word ? `"${s.word}"` : '—'} />
      <InspectorRow k="char index" v={s.ci ?? '—'} />
      <InspectorRow k="signature" v={s.key ? `"${s.key}"` : '""'} />
      <InspectorRow k="groups" v={s.groups.length} />
      <InspectorRow k="words placed" v={totalWords} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-group-anagrams';
export const title = 'Group anagrams';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Group anagrams"?',
    choices: [
      {
        label: 'Hash by signature — fits this problem',
        correct: true,
      },
      {
        label: 'Adjacent swap — different approach',
      },
      {
        label: 'Two pointers — different approach',
      },
      {
        label: 'Reverse in place — different approach',
      },
    ],
    explain: '26-letter count string is the bucket key',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Group anagrams), what strategy is established?',
    choices: [
      {
        label: '26-letter count string is the bucket — described in INIT caption',
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
      'Group anagrams: two words are anagrams when their letters match. We give each word a signature — its letters sorted — and bucket words that share a signature into the same group.',
  },
  {
    id: 'key-step',
    prompt: 'On the "COUNT" step (+), what happens?',
    choices: [
      {
        label: 'Fold letter "" (index ) — this move caption',
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
      'Fold letter "" (index ) into the signature. Collecting all letters of "" so we can sort them into a canonical key.',
  },
  {
    id: 'state',
    prompt: 'What does the `wi` field track in the visualization state?',
    choices: [
      {
        label: 'index of the word currently — updated each frame',
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
    explain: 'The recorder keeps `wi` in sync: index of the word currently being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Group anagrams"?',
    choices: [
      {
        label: 'O(n*k) time, O(n*k) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n·L) time, O(n·L) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n*k). O(n*k). key=string(26 counts); map key->list',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every word is bucketed. The map — final DONE caption',
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
      'Every word is bucketed. The map has  group(s) — that is the number of distinct anagram families among the input.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ga1',
      label: '["eat","tea","tan","ate","nat","bat"]',
      value: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'] },
    },
    {
      id: 'ga2',
      label: '["abc","cba","xyz"]',
      value: { strs: ['abc', 'cba', 'xyz'] },
    },
  ] satisfies SampleInput<GroupAnagramsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GroupAnagramsState | undefined;
    const n = s?.groups.length ?? 0;
    return { ok: n > 0, label: `${n} group${n === 1 ? '' : 's'}` };
  },
};
