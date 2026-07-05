import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface WordWrapInput {
  words: string[];
  maxWidth: number;
}

interface WordWrapState {
  words: string[];
  maxWidth: number;
  // Optimal cost to wrap words[i..n); INF = not yet computed.
  dp: number[];
  // next[i] = index just past the last word placed on the line starting at i.
  next: number[];
  i: number | null; // line-start word being solved (outer loop)
  j: number | null; // last word tried on this candidate line (inner loop)
  length: number | null; // width of words[i..j] with single spaces
  cost: number | null; // rem^2 + dp[j+1] for the current candidate
  lines: string[]; // reconstructed wrapped output (only on the final frame)
  done: boolean;
}

const INF = Number.MAX_SAFE_INTEGER;

function joinWords(words: string[]): string {
  return words.join(' ');
}

function record({ words, maxWidth }: WordWrapInput): Frame<WordWrapState>[] {
  const n = words.length;  const dp = new Array<number>(n + 1).fill(INF);
  const next = new Array<number>(Math.max(n, 0)).fill(0);
  dp[n] = 0;

  const { emit, frames } = createRecorder<WordWrapState>(() => ({
        words,
        maxWidth,
        dp: dp.slice(),
        next: next.slice(),
        i: null,
        j: null,
        length: null,
        cost: null,
        lines: [],
        done: false
      }));

  emit(
    'INIT',
    `maxWidth=${maxWidth}`,
    `Word Wrap: pack these ${n} words into lines no wider than ${maxWidth}. Each non-last line pays slack² (the leftover space squared). dp[i] = the minimum total cost to wrap words[i..end], solved right-to-left so dp[i+1..] are already known.`,
    {},
  );

  for (let i = n - 1; i >= 0; i--) {
    dp[i] = INF;
    let length = 0;
    emit(
      'LINE',
      `i=${i}`,
      `Solve dp[${i}]: what is the cheapest way to lay out lines starting from word "${words[i]}"? Try every line that begins at word ${i}, adding one more word at a time until it overflows.`,
      { i, length: 0 },
    );

    for (let j = i; j < n; j++) {
      if (j > i) length++; // the space before words[j]
      length += words[j].length;

      if (length > maxWidth) {
        emit(
          'OVERFLOW',
          `${length}>${maxWidth}`,
          `Adding "${words[j]}" makes the line width ${length}, which exceeds ${maxWidth}. No line can hold words ${i}..${j} or beyond, so stop extending this line.`,
          { i, j, length },
          'bad',
        );
        break;
      }

      let cost = 0;
      if (j < n - 1) {
        const rem = maxWidth - length;
        cost = rem * rem + dp[j + 1];
        emit(
          'TRY',
          `cost=${cost}`,
          `Line = words ${i}..${j} ("${joinWords(words.slice(i, j + 1))}"), width ${length}, slack ${rem}. Cost = slack² + dp[${j + 1}] = ${rem}² + ${dp[j + 1]} = ${cost}. Break after word ${j}?`,
          { i, j, length, cost },
        );
      } else {
        emit(
          'TRY',
          `cost=0`,
          `Line = words ${i}..${j} ("${joinWords(words.slice(i, j + 1))}") reaches the last word, width ${length} ≤ ${maxWidth}. The final line is free (no slack penalty), so this candidate costs 0.`,
          { i, j, length, cost: 0 },
        );
      }

      if (cost < dp[i]) {
        dp[i] = cost;
        next[i] = j + 1;
        emit(
          'PICK',
          `dp[${i}]=${cost}`,
          `${cost} beats the best cost seen for dp[${i}], so record it: dp[${i}] = ${cost} and cut the first line right after word ${j} (next[${i}] = ${j + 1}).`,
          { i, j, length, cost, dp: dp.slice(), next: next.slice() },
          'good',
        );
      }
    }
  }

  // Reconstruct the wrapped lines by following next[] from word 0.
  const lines: string[] = [];
  let cur = 0;
  while (cur < n) {
    const end = next[cur] - 1;
    lines.push(joinWords(words.slice(cur, end + 1)));
    cur = next[cur];
  }

  emit(
    'DONE',
    `cost=${n > 0 ? dp[0] : 0}`,
    `Table complete. dp[0] = ${n > 0 ? dp[0] : 0} is the minimum total slack² cost. Follow next[] from word 0 to read off the wrapped lines shown below.`,
    { done: true, lines },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<WordWrapState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null) pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'below' });

  const tone = (idx: number) => {
    if (s.i !== null && s.j !== null && idx >= s.i && idx <= s.j) return 'in-window';
    if (s.i === idx) return 'match';
    return '';
  };

  const cost = (v: number) => (v >= INF ? '∞' : v);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        maxWidth = <span className="font-mono text-ink">{s.maxWidth}</span>
        {s.length !== null && (
          <>
            {' · '}line width ={' '}
            <span
              className={cn(
                'font-mono',
                s.length > s.maxWidth ? 'text-bad' : 'text-ink',
              )}
            >
              {s.length}
            </span>
          </>
        )}
        {s.cost !== null && !s.done && (
          <>
            {' · '}cost ={' '}
            <span className="font-mono text-ink">{s.cost}</span>
          </>
        )}
      </div>

      <ArrayRow values={s.words} cellTone={tone} pointers={pointers} windowRange={null} />

      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>
        dp [{s.dp.map((v) => cost(v)).join(', ')}]
      </div>

      {s.lines.length > 0 ? (
        <div className="mt-1">
          {s.lines.map((ln, k) => (
            <div key={k} className={cn('font-mono text-good', vizText.sm)}>
              │{ln.padEnd(s.maxWidth, ' ')}│
            </div>
          ))}
        </div>
      ) : (
        s.i !== null &&
        s.j !== null && (
          <div className={cn('mt-1 font-mono text-ink2', vizText.sm)}>
            line: {joinWords(s.words.slice(s.i, s.j + 1))}
          </div>
        )
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordWrapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const dpAt = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.dp.length
      ? s.dp[idx] >= INF
        ? '∞'
        : s.dp[idx]
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="maxWidth" v={s.maxWidth} />
      <InspectorRow k="i (line start)" v={s.i ?? '—'} />
      <InspectorRow k="j (last word)" v={s.j ?? '—'} />
      <InspectorRow k="line width" v={s.length ?? '—'} />
      <InspectorRow k="candidate cost" v={s.cost ?? '—'} />
      <InspectorRow k="dp[i]" v={dpAt(s.i)} />
      <InspectorRow k="answer dp[0]" v={s.done ? dpAt(0) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-word-wrap';
export const title = 'Word wrap';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ww1',
      label: '["aaa","bb","cc","ddddd"] w=6',
      value: { words: ['aaa', 'bb', 'cc', 'ddddd'], maxWidth: 6 },
    },
    {
      id: 'ww2',
      label: '["a","b","c","d"] w=5',
      value: { words: ['a', 'b', 'c', 'd'], maxWidth: 5 },
    },
  ] satisfies SampleInput<WordWrapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordWrapState | undefined;
    if (!s || s.words.length === 0) return { ok: true, label: 'cost 0' };
    const total = s.dp[0] >= INF ? INF : s.dp[0];
    return { ok: true, label: `cost ${total} · ${s.lines.length} lines` };
  },
};
