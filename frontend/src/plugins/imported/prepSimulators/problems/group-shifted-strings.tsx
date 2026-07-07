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

interface GroupShiftedInput {
  words: string[];
}

// One [key, members] entry in the running groups map.
type GroupEntry = [string, string[]];

interface GroupShiftedState {
  words: string[];
  wi: number | null; // index of the word being processed
  chars: string[]; // characters of the current word
  ci: number | null; // char index whose shift-diff we just computed
  diffs: number[]; // diff values computed so far for the current word
  key: string | null; // finished diff key for the current word
  groups: GroupEntry[]; // groups map built so far
  assignedKey: string | null; // key just assigned to (for highlighting)
  done: boolean;
  result: number; // number of groups so far
}

// mod-26 forward shift distance between two lowercase letters.
function shift(a: string, b: string): number {
  return (b.charCodeAt(0) - a.charCodeAt(0) + 26) % 26;
}

function record({ words }: GroupShiftedInput): Frame<GroupShiftedState>[] {
  const groups = new Map<string, string[]>();

  const snapshotGroups = (): GroupEntry[] => [...groups.entries()].map(([k, v]) => [k, [...v]]);

  const { emit, frames } = createRecorder<GroupShiftedState>(() => ({
    words,
    wi: null,
    chars: [],
    ci: null,
    diffs: [],
    key: null,
    groups: snapshotGroups(),
    assignedKey: null,
    done: false,
    result: groups.size,
  }));

  emit(
    'INIT',
    `${words.length} words`,
    `Group Shifted Strings: two words belong together if one is a repeated single-shift of the other. We fingerprint each word by the gaps between neighbouring letters (mod 26) and group words that share the same fingerprint.`,
    {},
  );

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const chars = word.split('');
    const diffs: number[] = [];

    emit(
      'WORD',
      `"${word}"`,
      `Start word #${wi} = "${word}". Compute its shift-diff key by walking left to right and recording (letter − previous letter) mod 26 for each step.`,
      { wi, chars, ci: null, diffs: [] },
    );

    for (let ci = 1; ci < chars.length; ci++) {
      const d = shift(chars[ci - 1], chars[ci]);
      diffs.push(d);
      emit(
        'DIFF',
        `${chars[ci - 1]}→${chars[ci]} = ${d}`,
        `Gap from '${chars[ci - 1]}' to '${chars[ci]}' is (${chars[ci].charCodeAt(0) - 97} − ${chars[ci - 1].charCodeAt(0) - 97} + 26) mod 26 = ${d}. Append it to the key.`,
        { wi, chars, ci, diffs: [...diffs] },
      );
    }

    const key = diffs.join(',');

    if (groups.has(key)) {
      groups.get(key)!.push(word);
      emit(
        'MATCH',
        `key "${key}"`,
        `Key for "${word}" is "${key || '∅'}", which already exists — add "${word}" to that existing group. No new group created.`,
        { wi, chars, ci: null, diffs: [...diffs], key, assignedKey: key },
        'good',
      );
    } else {
      groups.set(key, [word]);
      emit(
        'NEW',
        `key "${key}"`,
        `Key for "${word}" is "${key || '∅'}", which is unseen — open a brand-new group holding just "${word}". Group count is now ${groups.size}.`,
        { wi, chars, ci: null, diffs: [...diffs], key, assignedKey: key },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `${groups.size} groups`,
    `Every word placed. There are ${groups.size} distinct shift groups — that is the answer.`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<GroupShiftedState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.ci !== null && s.ci > 0) {
    pointers.push({ i: s.ci - 1, label: 'prev', tone: 'warn', place: 'above' });
    pointers.push({ i: s.ci, label: 'cur', tone: 'accent', place: 'below' });
  }
  const tone = (i: number): string => {
    if (s.ci === null) return s.chars.length ? 'found' : '';
    if (i === s.ci) return 'match';
    if (i < s.ci) return 'in-window';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.wi !== null ? (
          <>
            word #{s.wi} = <span className="font-mono text-ink">"{s.words[s.wi]}"</span>
          </>
        ) : (
          <>{s.words.length} words to group</>
        )}
      </div>

      {s.chars.length > 0 ? (
        <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          {s.words.map((w) => `"${w}"`).join('  ')}
        </div>
      )}

      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        key: <span className="text-ink">{s.chars.join('') || '·'}</span>
        {' → '}
        <span className={cn(s.key !== null ? 'text-good' : 'text-ink')}>
          {(s.key ?? s.diffs.join(',')) || '∅'}
        </span>
      </div>

      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        groups {'{'}
        {s.groups.length === 0
          ? ''
          : s.groups.map(([k, members]) => `${k || '∅'}: [${members.join(', ')}]`).join('  |  ')}
        {'}'}
      </div>

      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.result} group{s.result === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<GroupShiftedState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="word idx" v={s.wi ?? '—'} />
      <InspectorRow k="word" v={s.wi !== null ? `"${s.words[s.wi]}"` : '—'} />
      <InspectorRow k="char idx" v={s.ci ?? '—'} />
      <InspectorRow k="diffs so far" v={s.diffs.length ? s.diffs.join(',') : '—'} />
      <InspectorRow k="key" v={s.key ?? '…'} />
      <InspectorRow k="group count" v={s.result} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-group-shifted-strings';
export const title = 'Group Shifted Strings';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Group Shifted Strings"?',
    choices: [
      {
        label: 'Hash Map (diff key) — fits this problem',
        correct: true,
      },
      {
        label: 'DP palindrome — different approach',
      },
      {
        label: 'Wildcard Hash Set — different approach',
      },
      {
        label: 'Hash by signature — different approach',
      },
    ],
    explain: 'See Group Shifted Strings pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Group Shifted Strings), what strategy is established?',
    choices: [
      {
        label: 'See Group Shifted Strings pattern — described in INIT caption',
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
      'Group Shifted Strings: two words belong together if one is a repeated single-shift of the other. We fingerprint each word by the gaps between neighbouring letters (mod 26) and group words that share the same fingerprint.',
  },
  {
    id: 'key-step',
    prompt: 'On the "MATCH" step (key ""), what happens?',
    choices: [
      {
        label: 'Key for "" is "", which — this move caption',
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
      'Key for "" is "", which already exists — add "" to that existing group. No new group created.',
  },
  {
    id: 'state',
    prompt: 'What does the `wi` field track in the visualization state?',
    choices: [
      {
        label: 'index of the word — updated each frame',
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
    explain: 'The recorder keeps `wi` in sync: index of the word being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Group Shifted Strings"?',
    choices: [
      {
        label: 'O(n·L) time, O(n·L) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·26) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n·L). O(n·L). Group Shifted Strings',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every word placed. There are distinct — final DONE caption',
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
    explain: 'Every word placed. There are  distinct shift groups — that is the answer.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'gss1', label: '[abc, bcd, xyz, az]', value: { words: ['abc', 'bcd', 'xyz', 'az'] } },
    { id: 'gss2', label: '[acef, a, z, ry]', value: { words: ['acef', 'a', 'z', 'ry'] } },
  ] satisfies SampleInput<GroupShiftedInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GroupShiftedState | undefined;
    const n = s?.result ?? 0;
    return { ok: n > 0, label: `${n} group${n === 1 ? '' : 's'}` };
  },
};
