import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CountWordsInput {
  text: string;
}

interface CountWordsState {
  text: string;
  words: string[];
  wordIdx: number | null;
  count: number;
  done: boolean;
}

function countWords(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/) : [];
}

function record({ text }: CountWordsInput): Frame<CountWordsState>[] {
  const words = countWords(text);
  const frames: Frame<CountWordsState>[] = [];
  let count = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<CountWordsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { text, words, wordIdx: null, count, done: false, ...s },
    });

  emit(
    'INIT',
    'ScanWords',
    `Count words in file: open the file, attach a \`bufio.Scanner\` with \`Split(bufio.ScanWords)\`, then increment count on each successful \`Scan()\`.`,
    {},
  );

  if (words.length === 0) {
    emit('DONE', 'count=0', `Empty file — scanner finds no tokens, count stays 0.`, { count: 0, done: true }, 'good');
    return frames;
  }

  for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
    count++;
    emit(
      'SCAN',
      `word ${count}: "${words[wordIdx]}"`,
      `\`scanner.Scan()\` returned true — token "${words[wordIdx]}" is word #${count}. The scanner advances to the next whitespace-delimited token.`,
      { wordIdx, count },
    );
  }

  emit(
    'DONE',
    `count=${count}`,
    `Scanner exhausted. Total word count = ${count}.`,
    { count, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CountWordsState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>file content</div>
      <div className={cn('rounded border border-line bg-surface2 p-2 font-mono', vizText.sm)}>
        {s.text || '(empty)'}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        words ({s.words.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {s.words.map((w, i) => (
          <span
            key={i}
            className={cn(
              'rounded px-1.5 py-0.5 font-mono',
              vizText.sm,
              s.wordIdx === i ? 'bg-accentbg text-accent' : i < (s.wordIdx ?? -1) ? 'bg-surface2 text-ink3' : 'bg-surface2 text-ink',
            )}
          >
            {w}
          </span>
        ))}
      </div>
      <div className={cn('mt-2 font-mono text-good', vizText.base)}>
        count = {s.count}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CountWordsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="word idx" v={s.wordIdx ?? '—'} />
      <InspectorRow k="current word" v={s.wordIdx !== null ? s.words[s.wordIdx] : '—'} />
      <InspectorRow k="count" v={s.count} />
      <InspectorRow k="total words" v={s.words.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-count-words-in-file';
export const title = 'Count words in file';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'cw1', label: '"hello world foo"', value: { text: 'hello world foo' } },
    { id: 'cw2', label: '"one two three four"', value: { text: 'one two three four' } },
  ] satisfies SampleInput<CountWordsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CountWordsState | undefined;
    return s?.done ? { ok: true, label: `count = ${s.count}` } : { ok: false, label: 'incomplete' };
  },
};
