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

interface NgeInput {
  n: number;
}

interface NgeState {
  n: number;
  digits: string[]; // current arrangement of digits (mutated over time)
  i: number | null; // pivot index (first descent from the right)
  j: number | null; // index of the smallest digit > digits[i]! to the right
  scanA: number | null; // pointer scanning left for the pivot
  scanB: number | null; // pointer scanning right for the swap partner
  loR: number | null; // suffix-reversal left pointer
  hiR: number | null; // suffix-reversal right pointer
  result: number | null; // final answer once known
  done: boolean;
  overflow: boolean; // result exceeded int32 → -1
}

const INT32_MAX = 2147483647;

function record({ n }: NgeInput): Frame<NgeState>[] {
  const s = String(n).split('');
  const k = s.length;

  const { emit, frames } = createPrepRecorder<NgeState>(() => ({
    n,
    digits: s.slice(),
    i: null,
    j: null,
    scanA: null,
    scanB: null,
    loR: null,
    hiR: null,
    result: null,
    done: false,
    overflow: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Next Greater Element III: find the smallest number greater than ${n} that uses exactly the same digits. This is the "next permutation" of the digit string — O(d) in the digit count d.`,
    {},
  );

  // Step 1: find pivot i — the first index (from the right) where s[i]! < s[i+1]!.
  let i = k - 2;
  while (i >= 0 && s[i]! >= s[i + 1]!) {
    emit(
      'SCAN_PIVOT',
      `s[${i}]!=${s[i]!} ≥ s[${i + 1}]!=${s[i + 1]!}`,
      `Scan from the right looking for the pivot: the first digit that is smaller than the one after it. digits[${i}]!=${s[i]!} is not less than digits[${i + 1}]!=${s[i + 1]!}, so keep moving left.`,
      { scanA: i },
    );
    i--;
  }

  if (i < 0) {
    emit(
      'NO_PIVOT',
      'digits descending',
      `We fell off the left edge without finding a pivot — the digits are in fully descending order, which is already the largest permutation. There is no greater arrangement, so the answer is -1.`,
      { result: -1, done: true, overflow: false },
      'bad',
    );
    return frames;
  }

  emit(
    'PIVOT',
    `i=${i} (${s[i]!})`,
    `Found the pivot at index ${i} (digit ${s[i]!}): everything to its right is descending, so digits[${i}]! is the one we must increase to get the next-larger number.`,
    { i },
  );

  // Step 2: find j — rightmost digit strictly greater than s[i]!.
  let j = k - 1;
  while (s[j]! <= s[i]!) {
    emit(
      'SCAN_SWAP',
      `s[${j}]!=${s[j]!} ≤ s[${i}]!=${s[i]!}`,
      `Scan the descending suffix from the right for the smallest digit still greater than the pivot ${s[i]!}. digits[${j}]!=${s[j]!} is not greater than ${s[i]!}, so move left.`,
      { i, scanB: j },
    );
    j--;
  }

  emit(
    'FIND_SWAP',
    `j=${j} (${s[j]!})`,
    `digits[${j}]!=${s[j]!} is the smallest digit in the suffix that still exceeds the pivot ${s[i]!}. Swapping it in makes the number just barely larger.`,
    { i, j },
  );

  // Step 3: swap pivot with j.
  const tmp = s[i]!;
  s[i]! = s[j]!;
  s[j]! = tmp;
  emit(
    'SWAP',
    `swap ${s[j]!}↔${s[i]!}`,
    `Swap the pivot with digits[${j}]!: now index ${i} holds ${s[i]!}. The prefix is fixed at the smallest possible increase; the suffix is still descending (largest).`,
    { i, j },
  );

  // Step 4: reverse the suffix after i to make it ascending (smallest).
  let l = i + 1;
  let r = k - 1;
  if (l < r) {
    emit(
      'REVERSE_START',
      `reverse [${l}..${r}]`,
      `The suffix after the pivot is still in descending order (its largest arrangement). Reverse it to ascending so the whole number becomes the smallest value greater than ${n}.`,
      { loR: l, hiR: r },
    );
  }
  while (l < r) {
    const t = s[l]!;
    s[l]! = s[r]!;
    s[r]! = t;
    emit(
      'REVERSE_SWAP',
      `swap idx ${l}↔${r}`,
      `Reversing the suffix: exchange digits[${l}]!=${s[r]!} and digits[${r}]!=${s[l]!} (shown after the swap). Move both pointers inward.`,
      { loR: l, hiR: r },
    );
    l++;
    r--;
  }

  const val = Number(s.join(''));
  if (val > INT32_MAX) {
    emit(
      'OVERFLOW',
      `${val} > 2^31−1`,
      `The candidate ${val} exceeds the 32-bit signed integer limit (${INT32_MAX}), so per the problem constraints we return -1.`,
      { result: -1, done: true, overflow: true },
      'bad',
    );
    return frames;
  }

  emit(
    'DONE',
    `${val}`,
    `The suffix is now ascending. The digits spell ${val}, the smallest number greater than ${n} using the same digits.`,
    { result: val, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<NgeState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.scanA !== null) pointers.push({ i: s.scanA, label: 'scan', tone: 'warn', place: 'above' });
  if (s.scanB !== null) pointers.push({ i: s.scanB, label: 'scan', tone: 'warn', place: 'below' });
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null) pointers.push({ i: s.j, label: 'j', tone: 'good', place: 'below' });
  if (s.loR !== null) pointers.push({ i: s.loR, label: 'l', tone: 'bad', place: 'below' });
  if (s.hiR !== null) pointers.push({ i: s.hiR, label: 'r', tone: 'bad', place: 'below' });

  const tone = (idx: number) => {
    if (s.result !== null && s.result !== -1) return 'found';
    if (s.i === idx) return 'mid';
    if (s.j === idx) return 'match';
    if (s.loR === idx || s.hiR === idx) return 'hi';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {s.i !== null && !s.done && (
          <>
            {' · '}pivot i = <span className="font-mono text-ink">{s.i}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        current = <span className="font-mono text-ink">{s.digits.join('')}</span>
      </div>
      {s.result !== null && (
        <div
          className={cn('mt-1 font-mono', vizText.base, s.result === -1 ? 'text-bad' : 'text-good')}
        >
          → {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<NgeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.digits.length ? s.digits[idx]! : '—';
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="digits" v={s.digits.join('')} />
      <InspectorRow k="pivot i" v={s.i ?? '—'} />
      <InspectorRow k="digits[i]!" v={at(s.i)} />
      <InspectorRow k="swap j" v={s.j ?? '—'} />
      <InspectorRow k="digits[j]!" v={at(s.j)} />
      <InspectorRow k="result" v={s.result !== null ? s.result : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-next-greater-element-iii';
export const title = 'Next Greater Element III';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Next Greater Element III"?',
    choices: [
      {
        label: 'Next Permutation — fits this problem',
        correct: true,
      },
      {
        label: 'Base conversion repeated divmod — different approach',
      },
      {
        label: 'Palindrome number — different approach',
      },
      {
        label: 'Primality trial division — different approach',
      },
    ],
    explain: 'See Next Greater Element Iii pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Next Greater Element III), what strategy is established?',
    choices: [
      {
        label: 'See Next Greater Element Iii pattern — described in INIT caption',
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
      'Next Greater Element III: find the smallest number greater than  that uses exactly the same digits. This is the "next permutation" of the digit string — O(d) in the digit count d.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SWAP" step (swap ↔), what happens?',
    choices: [
      {
        label: 'Swap the pivot with digits[]: now — this move caption',
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
      'Swap the pivot with digits[]: now index  holds . The prefix is fixed at the smallest possible increase; the suffix is still descending (largest).',
  },
  {
    id: 'state',
    prompt: 'What does the `digits` field track in the visualization state?',
    choices: [
      {
        label: 'current arrangement of digits (mutated — updated each frame',
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
      'The recorder keeps `digits` in sync: current arrangement of digits (mutated over time)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Next Greater Element III"?',
    choices: [
      {
        label: 'O(d) time, O(d) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m*n) time, O(m+n) space — wrong order of growth',
      },
      {
        label: 'O(reservations) time, O(reserved rows) — wrong order of growth',
      },
      {
        label: 'O(log x) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(d). O(d). Next Greater Element Iii',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The suffix is now ascending. — final DONE caption',
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
      'The suffix is now ascending. The digits spell , the smallest number greater than  using the same digits.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'nge1', label: 'n = 12443322', value: { n: 12443322 } },
    { id: 'nge2', label: 'n = 21 (none)', value: { n: 21 } },
  ] satisfies SampleInput<NgeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as NgeState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no result' };
    if (s.result === -1) return { ok: true, label: '-1 (no larger permutation)' };
    return { ok: true, label: String(s.result) };
  },
};
