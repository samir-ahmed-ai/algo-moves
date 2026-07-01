import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SubsetWordsInput {
  text: string;
  words: string[];
}

interface SubsetWordsState {
  text: string;
  cnt: [string, number][]; // text letter pile (sorted by letter)
  words: string[];
  wIdx: number | null; // which word we are checking
  word: string; // the word's characters
  i: number | null; // current char index within word
  ch: string | null; // current char
  used: number; // running count of ch within the word so far
  avail: number; // cnt[ch] in the text pile
  fits: boolean | null; // did this char still fit?
  result: string[]; // words accepted so far
  done: boolean;
}

function record({ text, words }: SubsetWordsInput): Frame<SubsetWordsState>[] {
  const cnt = new Map<string, number>();
  for (const c of text) cnt.set(c, (cnt.get(c) ?? 0) + 1);
  const pile = (): [string, number][] =>
    [...cnt.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const result: string[] = [];

  const { emit, frames } = createRecorder<SubsetWordsState>(() => ({
        text,
        cnt: pile(),
        words,
        wIdx: null,
        word: '',
        i: null,
        ch: null,
        used: 0,
        avail: 0,
        fits: null,
        result: [...result],
        done: false
      }));

  emit(
    'INIT',
    `text="${text}"`,
    `Find all subset words: a word qualifies if its letters all fit inside text's letter pile. First tally how many of each letter text="${text}" has, then test each word against that pile. Time O(n), Space O(1).`,
    {},
  );

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const tmp = new Map<string, number>();
    let ok = true;

    emit(
      'WORD',
      `try "${word}"`,
      `Now test the word "${word}". Walk its letters left to right, counting how many times each letter is needed and checking that the need never exceeds what the text pile holds.`,
      { wIdx: w, word, i: null },
    );

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const used = (tmp.get(ch) ?? 0) + 1;
      tmp.set(ch, used);
      const avail = cnt.get(ch) ?? 0;
      const fits = used <= avail;

      if (!fits) {
        ok = false;
        emit(
          'OVER',
          `'${ch}' ${used}>${avail}`,
          `Letter '${ch}' is now needed ${used} time(s), but the text pile only has ${avail}. The word "${word}" needs more '${ch}' than text can supply, so it fails — stop checking it.`,
          { wIdx: w, word, i, ch, used, avail, fits: false },
          'bad',
        );
        break;
      }

      emit(
        'FIT',
        `'${ch}' ${used}<=${avail}`,
        `Letter '${ch}' is needed ${used} time(s) so far and the text pile has ${avail} — it still fits (${used} ≤ ${avail}). Move to the next letter.`,
        { wIdx: w, word, i, ch, used, avail, fits: true },
      );
    }

    if (ok) {
      result.push(word);
      emit(
        'ACCEPT',
        `"${word}" ✓`,
        `Every letter of "${word}" fit inside the text pile, so "${word}" is a subset word. Add it to the result.`,
        { wIdx: w, word, i: word.length - 1, result: [...result] },
        'good',
      );
    }
  }

  emit(
    'DONE',
    result.length ? `${result.length} word(s)` : 'none',
    `All words have been tested. The subset words are [${result.map((w) => `"${w}"`).join(', ') || '∅'}].`,
    { done: true, wIdx: null, word: '', i: null },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SubsetWordsState>) {
  const s = frame.state;
  const chars = s.word.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0)
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.i === null) return '';
    if (i > s.i) return '';
    if (i === s.i) return s.fits === false ? 'dead' : 'match';
    return 'found'; // earlier chars that already fit
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        text = <span className="font-mono text-ink">"{s.text}"</span> pile:{' '}
        <span className="font-mono text-ink">
          {'{'}
          {s.cnt.map(([c, n]) => `${c}:${n}`).join(', ')}
          {'}'}
        </span>
      </div>

      {s.word ? (
        <>
          <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
            checking word{' '}
            <span className="font-mono text-ink">"{s.word}"</span>
            {s.ch !== null && !s.done && (
              <>
                {' · '}need <span className="font-mono text-ink">'{s.ch}'</span> ={' '}
                <span className="font-mono text-ink">{s.used}</span>, have{' '}
                <span className="font-mono text-ink">{s.avail}</span>
              </>
            )}
          </div>
          <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
        </>
      ) : (
        <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
          words: <span className="font-mono text-ink">[{s.words.map((w) => `"${w}"`).join(', ')}]</span>
        </div>
      )}

      <div className={cn('mt-1 font-mono text-good', vizText.base)}>
        → [{s.result.map((w) => `"${w}"`).join(', ') || ' '}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SubsetWordsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="text" v={`"${s.text}"`} />
      <InspectorRow k="word" v={s.word ? `"${s.word}"` : '—'} />
      <InspectorRow k="char" v={s.ch ?? '—'} />
      <InspectorRow k="used (need)" v={s.ch !== null ? s.used : '—'} />
      <InspectorRow k="avail (text)" v={s.ch !== null ? s.avail : '—'} />
      <InspectorRow k="fits" v={s.fits === null ? '—' : s.fits ? 'yes' : 'no'} />
      <InspectorRow k="result" v={`[${s.result.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-all-subset-words';
export const title = 'Find all subset words';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fsw1',
      label: 'text="codebase" · 4 words',
      value: { text: 'codebase', words: ['code', 'base', 'cab', 'ace', 'bad'] },
    },
    {
      id: 'fsw2',
      label: 'text="aabbc" · 3 words',
      value: { text: 'aabbc', words: ['abc', 'aab', 'bbb'] },
    },
  ] satisfies SampleInput<SubsetWordsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubsetWordsState | undefined;
    const got = s?.result ?? [];
    return { ok: got.length > 0, label: got.length ? `[${got.join(', ')}]` : 'none' };
  },
};
