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

interface PalindromeInput {
  s: string;
}

interface PalindromeState {
  chars: string[]; // the string split into a per-cell char array
  l: number | null; // left pointer
  r: number | null; // right pointer
  compared: [number, number] | null; // the pair we just lowercased & compared
  matched: boolean | null; // true = pair matched, false = mismatch, null = n/a
  result: boolean | null; // final answer once known
  done: boolean;
}

function isAlnum(ch: string): boolean {
  return /^[A-Za-z0-9]$/.test(ch);
}

function toLower(ch: string): string {
  return ch.toLowerCase();
}

function record({ s }: PalindromeInput): Frame<PalindromeState>[] {
  const chars = s.split('');
  const { emit, frames } = createRecorder<PalindromeState>(() => ({
    chars,
    l: null,
    r: null,
    compared: null,
    matched: null,
    result: null,
    done: false,
  }));

  let l = 0;
  let r = chars.length - 1;

  emit(
    'INIT',
    `"${s}"`,
    `Is Palindrome: does the string read the same forwards and backwards, ignoring case and any non-alphanumeric characters? Two pointers l=0 and r=${r} march inward, skipping junk and comparing lowercased characters.`,
    { l, r },
  );

  let answer = true;

  outer: while (l < r) {
    // Skip non-alphanumeric on the left.
    while (l < r && !isAlnum(chars[l])) {
      emit(
        'SKIP_L',
        `skip '${chars[l]}'`,
        `Left character '${chars[l]}' at index ${l} is not alphanumeric, so we skip it: l++ → ${l + 1}.`,
        { l, r },
      );
      l++;
    }
    // Skip non-alphanumeric on the right.
    while (l < r && !isAlnum(chars[r])) {
      emit(
        'SKIP_R',
        `skip '${chars[r]}'`,
        `Right character '${chars[r]}' at index ${r} is not alphanumeric, so we skip it: r-- → ${r - 1}.`,
        { l, r },
      );
      r--;
    }

    if (l >= r) break;

    const a = toLower(chars[l]);
    const b = toLower(chars[r]);
    emit(
      'COMPARE',
      `'${chars[l]}' vs '${chars[r]}'`,
      `Lowercase the pair at l=${l} and r=${r}: '${chars[l]}'→'${a}', '${chars[r]}'→'${b}'.`,
      { l, r, compared: [l, r] },
    );
    if (a !== b) {
      emit(
        'MISMATCH',
        `'${a}' ≠ '${b}'`,
        `Compare lowercased characters: '${chars[l]}'→'${a}' at index ${l} versus '${chars[r]}'→'${b}' at index ${r}. They differ, so the string is NOT a palindrome — return false.`,
        { l, r, compared: [l, r], matched: false, result: false, done: true },
        'bad',
      );
      answer = false;
      break outer;
    }

    emit(
      'MATCH',
      `'${a}' = '${b}'`,
      `Compare lowercased characters: '${chars[l]}'→'${a}' at index ${l} versus '${chars[r]}'→'${b}' at index ${r}. They match, so move both pointers inward: l++ → ${l + 1}, r-- → ${r - 1}.`,
      { l, r, compared: [l, r], matched: true },
      'good',
    );
    l++;
    r--;
  }

  if (answer) {
    emit(
      'DONE',
      'palindrome',
      `The pointers met without any mismatch, so every alphanumeric character mirrored its partner. The string IS a palindrome — return true.`,
      { l, r, result: true, done: true },
      'good',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<PalindromeState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.compared && (i === s.compared[0] || i === s.compared[1])) {
      return s.matched === false ? 'dead' : 'found';
    }
    if (s.l === i || s.r === i) return 'match';
    return '';
  };

  const answerText =
    s.result === null ? '…comparing' : s.result ? 'palindrome ✓' : 'not palindrome ✗';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        answer ={' '}
        <span
          className={cn(
            'font-mono',
            s.result === null ? 'text-ink' : s.result ? 'text-good' : 'text-bad',
          )}
        >
          {answerText}
        </span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>ignore case &amp; non-alphanumerics</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PalindromeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (i: number | null) =>
    i !== null && i >= 0 && i < s.chars.length ? `'${s.chars[i]}'` : '—';
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="s[l]" v={at(s.l)} />
      <InspectorRow k="s[r]" v={at(s.r)} />
      <InspectorRow
        k="last compare"
        v={s.matched === null ? '—' : s.matched ? 'match' : 'mismatch'}
      />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-is-palindrome';
export const title = 'Is palindrome';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Is palindrome"?',
    choices: [
      {
        label: 'Two pointers — fits this problem',
        correct: true,
      },
      {
        label: 'Index Map — different approach',
      },
      {
        label: 'Stack of unmatched indices — different approach',
      },
      {
        label: 'Two Pointers — different approach',
      },
    ],
    explain: 'l and r march inward, skipping junk, comparing lowercased',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Is palindrome), what strategy is established?',
    choices: [
      {
        label: 'l and r march inward, skipping — described in INIT caption',
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
      'Is Palindrome: does the string read the same forwards and backwards, ignoring case and any non-alphanumeric characters? Two pointers l=0 and r= march inward, skipping junk and comparing lowercased characters.',
  },
  {
    id: 'key-step',
    prompt: "On the \"MISMATCH\" step ('' ≠ ''), what happens?",
    choices: [
      {
        label: "Compare lowercased characters: ''→'' — this move caption",
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
      "Compare lowercased characters: ''→'' at index  versus ''→'' at index . They differ, so the string is NOT a palindrome — return false.",
  },
  {
    id: 'state',
    prompt: 'What does the `chars` field track in the visualization state?',
    choices: [
      {
        label: 'the string split — updated each frame',
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
    explain: 'The recorder keeps `chars` in sync: the string split into a per-cell char array',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Is palindrome"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O( time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n*k) time, O(n*k) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). skip non-alnum both ends; toLower compare; l++ r--',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "Compare lowercased characters: ''→'' — final DONE caption",
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
      "Compare lowercased characters: ''→'' at index  versus ''→'' at index . They match, so move both pointers inward: l++ → , r-- → .",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ip1', label: '"Ab_a!"', value: { s: 'Ab_a!' } },
    { id: 'ip2', label: '"race"', value: { s: 'race' } },
  ] satisfies SampleInput<PalindromeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PalindromeState | undefined;
    const ok = s?.result ?? false;
    return { ok, label: ok ? 'palindrome' : 'not palindrome' };
  },
};
