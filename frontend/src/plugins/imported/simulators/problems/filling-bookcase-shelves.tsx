import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface ShelfInput {
  books: [number, number][]; // [thickness, height]
  shelfWidth: number;
}

interface ShelfState {
  books: [number, number][];
  shelfWidth: number;
  dp: number[]; // dp[i] = min total height for first i books; INF = not yet decided
  i: number | null; // book count currently being filled (1..n)
  from: number | null; // chosen shelf start: dp[from] is reused
  done: boolean;
}

const INF = 1 << 30;

function record({ books, shelfWidth }: ShelfInput): Frame<ShelfState>[] {
  const n = books.length;
  const dp = new Array<number>(n + 1).fill(INF);
  const { emit, frames } = createRecorder<ShelfState>(() => ({
        books: books,
        shelfWidth: shelfWidth,
        dp: dp.slice(),
        i: null,
        from: null,
        done: false
      }));

  emit('INIT', `${n} books, width ${shelfWidth}`, `Filling Bookcase Shelves: place the ${n} books in order on shelves of width ${shelfWidth}, minimizing total height. dp[i] = the least total height to shelve the first i books, built up from i = 0.`, { i: null, from: null });

  dp[0] = 0;
  emit('BASE', 'dp[0]=0', `Base case: shelving 0 books needs no height. dp[0] = 0.`, { i: 0, from: null });

  for (let i = 1; i <= n; i++) {
    let w = 0;
    let h = 0;
    let best = INF;
    let bestFrom: number | null = null;
    // Pull books j..i onto one new shelf, scanning j from i down to 1.
    for (let j = i; j >= 1; j--) {
      w += books[j - 1][0];
      if (w > shelfWidth) break;
      if (books[j - 1][1] > h) h = books[j - 1][1];
      if (dp[j - 1] + h < best) {
        best = dp[j - 1] + h;
        bestFrom = j - 1;
      }
    }
    dp[i] = best;
    const start = (bestFrom as number) + 1; // first book index (1-based) on the last shelf
    const shelfH = best - dp[bestFrom as number];
    emit('FILL', `dp[${i}]=${best}`, `Best for the first ${i} books: put books ${start}..${i} on the last shelf (height ${shelfH}) on top of dp[${bestFrom}] (=${dp[bestFrom as number]}), so dp[${i}] = ${dp[bestFrom as number]} + ${shelfH} = ${best}.`, { i: i, from: bestFrom });
  }

  emit('DONE', `${dp[n]} height`, `The table is full. dp[${n}] = ${dp[n]}, so the minimum total shelf height for all ${n} books is ${dp[n]}.`, { i: n, from: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<ShelfState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v >= INF ? '∞' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.from !== null) pointers.push({ i: s.from, label: 'from', tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] < INF ? 'match' : '');
  const n = s.books.length;
  const done = s.dp[n] < INF;
  const cell = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.dp.length ? (s.dp[idx] >= INF ? '∞' : s.dp[idx]) : '—';
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i ?? '—'} tone="accent" />
        <RailStat k="from" v={s.from !== null ? s.from : '—'} tone="warn" />
        <RailStat k="dp[from]" v={cell(s.from)} />
        <RailStat k="dp[i]" v={cell(s.i)} />
      </RailGroup>
      <RailResult label="answer" value={done ? `${s.dp[n]}` : '…'} tone={done ? 'good' : 'accent'} />
    </>}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ShelfState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (idx: number) => (idx >= 0 && idx < s.dp.length ? (s.dp[idx] >= INF ? '∞' : s.dp[idx]) : '—');
  const n = s.books.length;
  const done = s.dp[n] < INF;
  return (
    <VarGrid>
      <InspectorRow k="books" v={n} />
      <InspectorRow k="shelf width" v={s.shelfWidth} />
      <InspectorRow k="placing i" v={s.i ?? '—'} />
      <InspectorRow k="shelf start (from)" v={s.from !== null ? s.from + 1 : '—'} />
      <InspectorRow k="dp[from]" v={s.from !== null ? cell(s.from) : '—'} />
      <InspectorRow k="dp[i]" v={s.i !== null ? cell(s.i) : '—'} />
      <InspectorRow k="answer" v={done ? `${s.dp[n]} height` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-62-filling-bookcase-shelves';
export const title = 'Filling Bookcase Shelves';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'bk7',
      label: '7 books, width 4',
      value: {
        books: [
          [1, 1],
          [2, 3],
          [2, 3],
          [1, 1],
          [1, 1],
          [1, 1],
          [1, 2],
        ],
        shelfWidth: 4,
      },
    },
    {
      id: 'bk3',
      label: '3 books, width 4',
      value: {
        books: [
          [1, 3],
          [2, 4],
          [3, 2],
        ],
        shelfWidth: 4,
      },
    },
  ] satisfies SampleInput<ShelfInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as ShelfState) ?? null;
    const v = s ? s.dp[s.books.length] : INF;
    return { ok: true, label: `${v} height` };
  },
};
