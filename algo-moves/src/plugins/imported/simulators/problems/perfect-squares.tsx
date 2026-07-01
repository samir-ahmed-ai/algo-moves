import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SquaresInput {
  n: number;
}

interface SquaresState {
  n: number;
  dp: number[]; // dp[i] = fewest perfect squares summing to i; -1 = not filled yet
  i: number | null; // current dp index being filled
  from: number | null; // dp index reached after peeling the winning square (i - j*j)
  sq: number | null; // the winning square j*j
  done: boolean;
}

const EMPTY = -1;

function record({ n }: SquaresInput): Frame<SquaresState>[] {
  const dp = new Array<number>(n + 1).fill(EMPTY);
  const frames: Frame<SquaresState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    from: number | null,
    sq: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, dp: dp.slice(), i, from, sq, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Perfect Squares: the fewest perfect-square numbers (1, 4, 9, 16, …) that sum to ${n}. dp[i] = the minimum count of squares summing to i, built up from i = 0.`,
    null,
    null,
    null,
  );

  dp[0] = 0;
  emit('BASE', 'dp[0]=0', `Base case: 0 needs no squares at all. dp[0] = 0.`, 0, null, null);

  for (let i = 1; i <= n; i++) {
    // Worst case: i copies of the square 1, i.e. dp[i] starts at i.
    let best = i;
    let bestFrom = i - 1;
    let bestSq = 1;
    for (let j = 1; j * j <= i; j++) {
      const cand = dp[i - j * j] + 1;
      if (cand < best) {
        best = cand;
        bestFrom = i - j * j;
        bestSq = j * j;
      }
    }
    dp[i] = best;
    emit(
      'FILL',
      `dp[${i}]=${best}`,
      `Best for ${i}: peel off the square ${bestSq} (=${Math.round(Math.sqrt(bestSq))}²) as the last term, leaving ${bestFrom}, so dp[${i}] = dp[${bestFrom}] (=${dp[bestFrom]}) + 1 = ${best}.`,
      i,
      bestFrom,
      bestSq,
    );
  }

  const answer = dp[n];
  emit(
    'DONE',
    `${answer} squares`,
    `The table is full. dp[${n}] = ${answer}, so the fewest perfect squares summing to ${n} is ${answer}.`,
    n,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SquaresState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === EMPTY ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.from !== null) pointers.push({ i: s.from, label: `i−${s.sq}`, tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] !== EMPTY ? 'match' : '');
  const ans = s.dp[s.n] === EMPTY ? '…filling' : s.dp[s.n];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>, answer ={' '}
        <span className="font-mono text-ink">{ans}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>index = target sum, value = fewest squares</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SquaresState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number | null) =>
    i !== null && i >= 0 && i < s.dp.length ? (s.dp[i] === EMPTY ? '·' : s.dp[i]) : '—';
  const known = s.dp[s.n] !== EMPTY;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="i (target)" v={s.i ?? '—'} />
      <InspectorRow k="last square" v={s.sq ?? '—'} />
      <InspectorRow k="dp[i−square]" v={cell(s.from)} />
      <InspectorRow k="dp[i]" v={cell(s.i)} />
      <InspectorRow k="answer" v={known ? `${s.dp[s.n]} squares` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-64-perfect-squares';
export const title = 'Perfect Squares';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'ps12', label: 'n = 12', value: { n: 12 } },
    { id: 'ps7', label: 'n = 7', value: { n: 7 } },
  ] satisfies SampleInput<SquaresInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as SquaresState) ?? null;
    const v = s ? s.dp[s.n] : 0;
    return { ok: true, label: `${v} squares` };
  },
};
