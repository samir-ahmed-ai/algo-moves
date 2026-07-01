import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StairsInput {
  n: number;
}

interface StairsState {
  n: number;
  dp: number[]; // dp[i] = distinct ways to reach step i; -1 = not filled yet
  i: number | null; // current step being filled
  one: number | null; // i-1 (came from one step below)
  two: number | null; // i-2 (came from two steps below)
  done: boolean;
}

const EMPTY = -1;

function record({ n }: StairsInput): Frame<StairsState>[] {
  const dp = new Array<number>(n + 1).fill(EMPTY);
  const frames: Frame<StairsState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    one: number | null,
    two: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, dp: dp.slice(), i, one, two, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Climbing Stairs: each move climbs 1 or 2 steps, so we count the distinct ways to reach the top of ${n} steps. dp[i] = the number of ways to reach step i, built up from i = 0.`,
    null,
    null,
    null,
  );

  dp[0] = 1;
  emit('BASE', 'dp[0]=1', `Base case: there is one way to be at the ground (step 0) — do nothing. dp[0] = 1.`, 0, null, null);

  if (n >= 1) {
    dp[1] = 1;
    emit('BASE', 'dp[1]=1', `Base case: step 1 is reached only by a single 1-step move. dp[1] = 1.`, 1, null, null);
  }

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
    emit(
      'FILL',
      `dp[${i}]=${dp[i]}`,
      `Step ${i} is reached either from step ${i - 1} (one step up) or step ${i - 2} (two steps up), so dp[${i}] = dp[${i - 1}] (=${dp[i - 1]}) + dp[${i - 2}] (=${dp[i - 2]}) = ${dp[i]}.`,
      i,
      i - 1,
      i - 2,
    );
  }

  const answer = dp[n];
  emit(
    'DONE',
    `${answer} ways`,
    `The table is full. dp[${n}] = ${answer}, so there are ${answer} distinct ways to climb ${n} steps.`,
    n,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<StairsState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === EMPTY ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.one !== null) pointers.push({ i: s.one, label: 'i−1', tone: 'good', place: 'below' });
  if (s.two !== null) pointers.push({ i: s.two, label: 'i−2', tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] !== EMPTY ? 'match' : '');
  const ans = s.dp[s.n] === EMPTY ? '…filling' : s.dp[s.n];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> steps, answer ={' '}
        <span className="font-mono text-ink">{ans}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>index = step, value = ways to reach it</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<StairsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number | null) =>
    i !== null && i >= 0 && i < s.dp.length ? (s.dp[i] === EMPTY ? '·' : s.dp[i]) : '—';
  const known = s.dp[s.n] !== EMPTY;
  return (
    <VarGrid>
      <InspectorRow k="n (steps)" v={s.n} />
      <InspectorRow k="i (step)" v={s.i ?? '—'} />
      <InspectorRow k="dp[i−1]" v={cell(s.one)} />
      <InspectorRow k="dp[i−2]" v={cell(s.two)} />
      <InspectorRow k="dp[i]" v={cell(s.i)} />
      <InspectorRow k="answer" v={known ? `${s.dp[s.n]} ways` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-58-climbing-stairs';
export const title = 'Climbing Stairs';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'cs6', label: 'n = 6', value: { n: 6 } },
    { id: 'cs5', label: 'n = 5', value: { n: 5 } },
  ] satisfies SampleInput<StairsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as StairsState) ?? null;
    const v = s ? s.dp[s.n] : 0;
    return { ok: true, label: `${v} ways` };
  },
};
