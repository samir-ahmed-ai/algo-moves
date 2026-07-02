import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseWordsInput {
  s: string;
}

interface ReverseWordsState {
  s: string;
  words: string[]; // current order of the extracted words
  l: number | null; // left swap pointer (word index)
  r: number | null; // right swap pointer (word index)
  swapped: [number, number] | null; // the pair just exchanged
  result: string | null; // final joined answer once done
  done: boolean;
}

// strings.Fields: split on runs of whitespace, dropping leading/trailing blanks.
function fields(s: string): string[] {
  return s.split(/\s+/).filter((w) => w.length > 0);
}

function record({ s }: ReverseWordsInput): Frame<ReverseWordsState>[] {
  const words = fields(s);

  const { emit, frames } = createRecorder<ReverseWordsState>(() => ({
        s,
        words: words.slice(),
        l: null,
        r: null,
        swapped: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `"${s}"`,
    `Reverse Words in a String: we want the words in reverse order, collapsing any extra spaces. The plan is Split + Reverse — first cut the string into words, then reverse the list of words with two pointers.`,
    { words: [] },
  );

  emit(
    'SPLIT',
    `${words.length} words`,
    `Split on whitespace (like strings.Fields), dropping empty gaps. We get ${words.length} word${words.length === 1 ? '' : 's'}: [${words.map((w) => `"${w}"`).join(', ')}]. Now reverse this list in place.`,
    { words: words.slice() },
  );

  let l = 0;
  let r = words.length - 1;
  if (l >= r) {
    emit(
      'SKIP',
      'nothing to swap',
      `With ${words.length} word${words.length === 1 ? '' : 's'} the pointers already meet, so there is no pair to swap — the list is its own reverse.`,
      { words: words.slice(), l: words.length ? l : null, r: words.length ? r : null },
    );
  }

  while (l < r) {
    emit(
      'COMPARE',
      `swap ${l} & ${r}`,
      `l = ${l} points at "${words[l]}" and r = ${r} points at "${words[r]}". Since l < r, exchange these two words so the ends move toward the middle.`,
      { words: words.slice(), l, r },
    );

    const tmp = words[l];
    words[l] = words[r];
    words[r] = tmp;

    emit(
      'SWAP',
      `[${l}]↔[${r}]`,
      `Swapped: "${words[r]}" ↔ "${words[l]}". The word list is now [${words.map((w) => `"${w}"`).join(', ')}]. Advance l→${l + 1} and pull r→${r - 1}.`,
      { words: words.slice(), l, r, swapped: [l, r] },
    );

    l++;
    r--;
  }

  const result = words.join(' ');
  emit(
    'DONE',
    `"${result}"`,
    `The pointers crossed, so the list is fully reversed. Join the words with single spaces to get the answer: "${result}".`,
    { words: words.slice(), result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ReverseWordsState>) {
  const s = frame.state;
  const cells = s.words.length ? s.words.map((w) => `"${w}"`) : ['—'];
  const pointers: ArrayPointer[] = [];
  if (s.words.length) {
    if (s.l !== null && s.l >= 0) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
    if (s.r !== null && s.r >= 0) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'above' });
  }
  const inPair = (i: number) => s.swapped !== null && (i === s.swapped[0] || i === s.swapped[1]);
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (inPair(i)) return 'match';
    if (s.l === i || s.r === i) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        input = <span className="font-mono text-ink">"{s.s}"</span>
      </div>
      {s.words.length ? (
        <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>…splitting into words</div>
      )}
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>index = word position</div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.result}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseWordsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const word = (i: number | null) =>
    i !== null && i >= 0 && i < s.words.length ? `"${s.words[i]}"` : '—';
  return (
    <VarGrid>
      <InspectorRow k="words" v={s.words.length} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="words[l]" v={word(s.l)} />
      <InspectorRow k="words[r]" v={word(s.r)} />
      <InspectorRow k="result" v={s.result !== null ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-reverse-words-in-a-string';
export const title = 'Reverse Words in a String';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rw1', label: '"the sky is blue"', value: { s: 'the sky is blue' } },
    { id: 'rw2', label: '"  hello   world  "', value: { s: '  hello   world  ' } },
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
