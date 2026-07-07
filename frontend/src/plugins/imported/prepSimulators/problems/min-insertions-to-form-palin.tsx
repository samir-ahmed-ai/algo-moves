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

interface PalinInput {
  s: string;
}

interface PalinState {
  chars: string[]; // the input split into characters
  dp: number[][]; // dp[l][r] = length of longest palindromic subsequence in s[l..r]
  l: number | null; // current left index of the interval
  r: number | null; // current right index of the interval
  matched: boolean | null; // did s[l] === s[r] on this step?
  lps: number | null; // final longest palindromic subsequence length (dp[0][n-1])
  answer: number | null; // insertions needed = n - lps
  done: boolean;
}

const NONE = -1;

function record({ s }: PalinInput): Frame<PalinState>[] {
  const chars = s.split('');
  const n = chars.length;
  const dp: number[][] = Array.from({ length: Math.max(n, 1) }, () =>
    new Array<number>(Math.max(n, 1)).fill(NONE),
  );

  const cloneDp = (): number[][] => dp.map((row) => row.slice());

  const { emit, frames } = createRecorder<PalinState>(() => ({
    chars,
    dp: cloneDp(),
    l: null,
    r: null,
    matched: null,
    lps: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `s="${s}"`,
    `Minimum insertions to make "${s}" a palindrome. The trick: the fewest insertions equals n − LPS, where LPS is the Longest Palindromic Subsequence. We build LPS with an interval DP where dp[l][r] is the LPS length of the substring s[l..r].`,
    {},
  );

  if (n === 0) {
    emit(
      'DONE',
      '0 insertions',
      `The empty string is already a palindrome, so 0 insertions are needed.`,
      { lps: 0, answer: 0, done: true },
      'good',
    );
    return frames;
  }

  // Base case: every single character is a palindrome of length 1.
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  emit(
    'BASE',
    'diagonal = 1',
    `Base case: any single character is a palindrome of length 1, so dp[i][i] = 1 for every i. These sit on the diagonal of the table.`,
    { l: 0, r: 0 },
  );

  // Fill intervals from the shortest (length 2) outward, matching the Go loop
  // which sweeps l downward and r upward so every dp[l+1][r-1], dp[l+1][r] and
  // dp[l][r-1] is already computed.
  for (let l = n - 2; l >= 0; l--) {
    for (let r = l + 1; r < n; r++) {
      if (chars[l] === chars[r]) {
        dp[l][r] = dp[l + 1][r - 1] + 2;
        emit(
          'MATCH',
          `dp[${l}][${r}]=${dp[l][r]}`,
          `s[${l}]='${chars[l]}' equals s[${r}]='${chars[r]}', so both ends join the palindrome. dp[${l}][${r}] = dp[${l + 1}][${r - 1}] (=${dp[l + 1][r - 1]}) + 2 = ${dp[l][r]}.`,
          { l, r, matched: true },
          'good',
        );
      } else {
        dp[l][r] = Math.max(dp[l + 1][r], dp[l][r - 1]);
        emit(
          'SKIP',
          `dp[${l}][${r}]=${dp[l][r]}`,
          `s[${l}]='${chars[l]}' differs from s[${r}]='${chars[r]}', so drop one end and keep the better subsequence. dp[${l}][${r}] = max(dp[${l + 1}][${r}]=${dp[l + 1][r]}, dp[${l}][${r - 1}]=${dp[l][r - 1]}) = ${dp[l][r]}.`,
          { l, r, matched: false },
        );
      }
    }
  }

  const lps = dp[0][n - 1];
  const answer = n - lps;
  emit(
    'DONE',
    `${answer} insertions`,
    `The whole-string cell dp[0][${n - 1}] = ${lps} is the longest palindromic subsequence length. Every character NOT in it needs a mirror inserted, so the answer is n − LPS = ${n} − ${lps} = ${answer}.`,
    { l: 0, r: n - 1, lps, answer, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PalinState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null && s.r !== s.l)
    pointers.push({ i: s.r, label: 'r', tone: 'good', place: 'above' });
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.l !== null && s.r !== null && i > s.l && i < s.r) return 'in-window';
    if (i === s.l) return 'lo';
    if (i === s.r) return 'hi';
    return '';
  };
  const window: [number, number] | null = s.l !== null && s.r !== null ? [s.l, s.r] : null;
  const cur =
    s.l !== null && s.r !== null && s.dp[s.l]?.[s.r] !== undefined && s.dp[s.l][s.r] !== NONE
      ? s.dp[s.l][s.r]
      : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.chars.join('')}"</span>
        {s.l !== null && s.r !== null && !s.done && (
          <>
            {' · '}interval [{s.l},{s.r}]
            {cur !== null && (
              <>
                {' '}
                dp = <span className="font-mono text-ink">{cur}</span>
              </>
            )}
          </>
        )}
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        LPS = {s.lps ?? '…'}
        {s.answer !== null && <span className="text-good"> → insertions = {s.answer}</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PalinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell =
    s.l !== null && s.r !== null && s.dp[s.l]?.[s.r] !== undefined && s.dp[s.l][s.r] !== NONE
      ? s.dp[s.l][s.r]
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.chars.join('')}"`} />
      <InspectorRow k="n" v={s.chars.length} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="s[l]" v={s.l !== null ? `'${s.chars[s.l]}'` : '—'} />
      <InspectorRow k="s[r]" v={s.r !== null ? `'${s.chars[s.r]}'` : '—'} />
      <InspectorRow k="dp[l][r]" v={cell} />
      <InspectorRow k="LPS" v={s.lps ?? '…'} />
      <InspectorRow k="insertions" v={s.answer ?? (s.done ? 0 : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-min-insertions-to-form-palin';
export const title = 'Min insertions to form palin-';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Min insertions to form palin-"?',
    choices: [
      {
        label: 'DP palindrome — fits this problem',
        correct: true,
      },
      {
        label: 'Two Pointers — different approach',
      },
      {
        label: 'Frequency count — different approach',
      },
      {
        label: 'Char frequency — different approach',
      },
    ],
    explain: 'Answer is n minus the longest palindromic subsequence',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Min insertions to form palin-), what strategy is established?',
    choices: [
      {
        label: 'Answer is n minus the longest — described in INIT caption',
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
      'Minimum insertions to make "" a palindrome. The trick: the fewest insertions equals n − LPS, where LPS is the Longest Palindromic Subsequence. We build LPS with an interval DP where dp[l][r] is the LPS length of the substring s[l..r].',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step (dp[][]=), what happens?',
    choices: [
      {
        label: "s[]='' differs from s[]='', so drop — this move caption",
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
      "s[]='' differs from s[]='', so drop one end and keep the better subsequence. dp[][] = max(dp[][]=, dp[][]=) = .",
  },
  {
    id: 'state',
    prompt: 'What does the `chars` field track in the visualization state?',
    choices: [
      {
        label: 'the input split into characters — updated each frame',
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
    explain: 'The recorder keeps `chars` in sync: the input split into characters',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Min insertions to form palin-"?',
    choices: [
      {
        label: 'O(n^2) time, O(n^2) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n^2) time, O(1) space — wrong order of growth',
      },
    ],
    explain:
      'O(n^2). O(n^2). LPS interval DP; match -> +2 inside, else max(drop end); n-dp[0][n-1]',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The whole-string cell dp[0][] = — final DONE caption',
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
      'The whole-string cell dp[0][] =  is the longest palindromic subsequence length. Every character NOT in it needs a mirror inserted, so the answer is n − LPS =  −  = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mip1', label: '"leetcode"', value: { s: 'leetcode' } },
    { id: 'mip2', label: '"mbadm"', value: { s: 'mbadm' } },
  ] satisfies SampleInput<PalinInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PalinState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'no result' };
    return { ok: true, label: `${s.answer} insertions` };
  },
};
