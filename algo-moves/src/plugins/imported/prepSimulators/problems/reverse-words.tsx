import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseWordsInput {
  s: string;
}

type Phase = 'init' | 'trim' | 'reverse-all' | 'reverse-word' | 'done';

interface ReverseWordsState {
  chars: string[]; // current byte array (post-trim shrink applied)
  phase: Phase;
  l: number | null; // left swap pointer
  r: number | null; // right swap pointer
  wordStart: number | null; // start of the word span currently being reversed
  wordEnd: number | null; // end (inclusive) of that span
  done: boolean;
  result: string | null;
}

// Render a space as a visible middle-dot so blank cells still read on the board.
const SP = '·';
const show = (c: string) => (c === ' ' ? SP : c);

function record({ s }: ReverseWordsInput): Frame<ReverseWordsState>[] {
  const frames: Frame<ReverseWordsState>[] = [];
  // Work on a mutable char array, mirroring Go's []byte(s).
  let b = s.split('');

  const emit = (
    type: string,
    note: string,
    caption: string,
    st: Partial<ReverseWordsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars: b.map(show),
        phase: 'init',
        l: null,
        r: null,
        wordStart: null,
        wordEnd: null,
        done: false,
        result: null,
        ...st,
      },
    });

  emit(
    'INIT',
    `"${s}"`,
    `Reverse Words: reverse the order of the words in "${s}" while keeping each word's letters intact. Trick: reverse the whole string, then reverse every word back — all in place, O(1) extra space.`,
    { phase: 'init' },
  );

  // --- trim: drop leading and trailing spaces by shrinking the slice ---
  let start = 0;
  let end = b.length - 1;
  while (start <= end && b[start] === ' ') start++;
  while (end >= start && b[end] === ' ') end--;
  const trimmed = start > 0 || end < b.length - 1;
  b = b.slice(start, end + 1);
  emit(
    'TRIM',
    trimmed ? `[${start}..${end}]` : 'no edge spaces',
    trimmed
      ? `Trim: skip the leading/trailing spaces so the useful text is [${start}..${end}]. The working string is now "${b.join('')}".`
      : `Trim: there are no spaces to strip from either end, so the working string stays "${b.join('')}".`,
    { phase: 'trim' },
  );

  // In-place reverse of b[l..r].
  const rev = (
    lo: number,
    hi: number,
    phase: Phase,
    wordStart: number | null,
    wordEnd: number | null,
    label: (l: number, r: number) => string,
  ) => {
    let l = lo;
    let r = hi;
    while (l < r) {
      [b[l], b[r]] = [b[r], b[l]];
      emit(
        'SWAP',
        `swap ${l}↔${r}`,
        label(l, r),
        { phase, l, r, wordStart, wordEnd },
      );
      l++;
      r--;
    }
  };

  // --- reverse the whole trimmed string ---
  if (b.length > 1) {
    rev(
      0,
      b.length - 1,
      'reverse-all',
      null,
      null,
      (l, r) =>
        `Reverse the whole string: swap the characters at ${l} and ${r}. After every swap the words end up in reverse order, but each word's own letters are now backwards too.`,
    );
  }
  emit(
    'AFTER-REVERSE',
    `"${b.join('')}"`,
    `Whole string reversed → "${b.join('')}". The words are in the right final order now, but each word reads backwards — the next pass flips each word back.`,
    { phase: 'reverse-all' },
  );

  // --- reverse each word span back to fix its letters ---
  let i = 0;
  while (i < b.length) {
    let j = i;
    while (j < b.length && b[j] !== ' ') j++;
    // word occupies [i, j-1]
    if (j - 1 > i) {
      rev(
        i,
        j - 1,
        'reverse-word',
        i,
        j - 1,
        (l, r) =>
          `Fix the word span [${i}..${j - 1}]: swap ${l} and ${r} to un-reverse this word's letters. It will read forwards again once the span is fully flipped.`,
      );
    } else {
      emit(
        'WORD',
        `span [${i}..${j - 1}]`,
        `The span [${i}..${Math.max(i, j - 1)}] is a single character (or empty), so there is nothing to flip — it already reads correctly.`,
        { phase: 'reverse-word', wordStart: i, wordEnd: j - 1 },
      );
    }
    i = j + 1;
  }

  const result = b.join('');
  emit(
    'DONE',
    `"${result}"`,
    `Every word span has been flipped back, so the answer is "${result}" — the words in reverse order with their letters intact.`,
    { phase: 'done', done: true, result },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ReverseWordsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'above' });

  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.l === i || s.r === i) return 'match';
    if (s.wordStart !== null && s.wordEnd !== null && i >= s.wordStart && i <= s.wordEnd) return 'in-window';
    return '';
  };

  const window: [number, number] | null =
    s.wordStart !== null && s.wordEnd !== null && s.wordEnd >= s.wordStart
      ? [s.wordStart, s.wordEnd]
      : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink2')}>
        {s.done ? '→ ' : ''}"{s.chars.map((c) => (c === SP ? ' ' : c)).join('')}"
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseWordsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const span =
    s.wordStart !== null && s.wordEnd !== null ? `[${s.wordStart}, ${s.wordEnd}]` : '—';
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="word span" v={span} />
      <InspectorRow k="length" v={s.chars.length} />
      <InspectorRow k="result" v={s.result ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-reverse-words';
export const title = 'Reverse words';

// Faithful port of the Go reverseWords: trim edges, reverse whole string, then
// reverse each word span back. Does NOT collapse interior spaces, so the samples
// avoid double spaces to keep the board readable. The verdict reads the real
// computed result straight off the last emitted frame.
export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rw1', label: '"the sky is"', value: { s: 'the sky is' } },
    { id: 'rw2', label: '"  hi bob  "', value: { s: '  hi bob  ' } },
  ] satisfies SampleInput<ReverseWordsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseWordsState | undefined;
    const label = s?.result ?? '';
    return { ok: !!s?.done, label: `"${label}"` };
  },
};
