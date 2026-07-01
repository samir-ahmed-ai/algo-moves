import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface CoinIIInput {
  coins: number[];
  amount: number;
}

interface CoinIIState {
  coins: number[];
  amount: number;
  dp: number[][]; // (n+1) × (amount+1); -1 = not yet filled
  cur: [number, number] | null; // [i, a] in dp coords
  done: boolean;
}

function record({ coins, amount }: CoinIIInput): Frame<CoinIIState>[] {
  const n = coins.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(amount + 1).fill(-1));
  const { emit, frames } = createRecorder<CoinIIState>(() => ({
        coins: coins,
        amount: amount,
        dp: dp.map((r) => r.slice()),
        cur: null,
        done: false
      }));

  emit('INIT', `${n} coins, amount ${amount}`, `Coin Change II: count the number of ways to make amount ${amount} using coins {${coins.join(', ')}}, where each coin type can be used any number of times. dp[i][a] = the number of ways to make amount a using only the first i coin types. Rows are coin types; columns are amount 0..${amount}.`, { cur: null });

  // Base column: there is exactly 1 way to make amount 0 (take nothing).
  for (let i = 0; i <= n; i++) dp[i][0] = 1;
  emit('BASE', 'col 0 = 1', `Base case: there is exactly 1 way to make amount 0 — pick no coins. So dp[i][0] = 1 for every row i.`, { cur: [0, 0] });

  // Base row: zero coin types → 0 ways for any positive amount.
  for (let a = 1; a <= amount; a++) dp[0][a] = 0;
  emit('BASE', 'row 0 = 0', `Base case: with 0 coin types there is no way to make any positive amount, so dp[0][a] = 0 for a from 1 to ${amount}.`, { cur: [0, amount] });

  for (let i = 1; i <= n; i++) {
    const coin = coins[i - 1];
    for (let a = 1; a <= amount; a++) {
      const skip = dp[i - 1][a];
      if (coin <= a) {
        const use = dp[i][a - coin];
        dp[i][a] = skip + use;
        emit('FILL', `dp[${i}][${a}]=${dp[i][a]}`, `Amount ${a} with coin types up to ${coin}: skip coin ${coin} entirely for dp[${i - 1}][${a}] = ${skip} ways, or use one more ${coin} on top of dp[${i}][${a - coin}] = ${use} ways. dp[${i}][${a}] = ${skip} + ${use} = ${dp[i][a]}.`, { cur: [i, a] });
      } else {
        dp[i][a] = skip;
        emit('FILL', `dp[${i}][${a}]=${dp[i][a]}`, `Coin ${coin} is larger than amount ${a}, so it can't help here: dp[${i}][${a}] = dp[${i - 1}][${a}] = ${skip}.`, { cur: [i, a] });
      }
    }
  }

  const ans = dp[n][amount];
  emit('DONE', `${ans} ways`, `The table is full. dp[${n}][${amount}] = ${ans}, so there ${ans === 1 ? 'is' : 'are'} ${ans} way${ans === 1 ? '' : 's'} to make amount ${amount}.`, { cur: [n, amount] , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CoinIIState>) {
  const s = frame.state;
  const n = s.coins.length;
  const display: (number | string)[][] = [];
  const head: (number | string)[] = ['c \\ a'];
  for (let a = 0; a <= s.amount; a++) head.push(a);
  display.push(head);
  for (let i = 0; i <= n; i++) {
    const rowLabel = i === 0 ? '∅' : `coin ${s.coins[i - 1]}`;
    const row: (number | string)[] = [rowLabel];
    for (let a = 0; a <= s.amount; a++) row.push(s.dp[i][a] < 0 ? '' : s.dp[i][a]);
    display.push(row);
  }

  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'visited'; // headers
    const i = r - 1;
    const a = c - 1;
    if (s.cur && s.cur[0] === i && s.cur[1] === a) return 'active';
    if (i === n && a === s.amount) return 'path';
    return s.dp[i][a] >= 0 ? 'visited' : '';
  };

  const activeCell: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const i = s.cur ? s.cur[0] : -1;
  const a = s.cur ? s.cur[1] : -1;
  const coin = i >= 1 ? s.coins[i - 1] : null;
  const cell = (ri: number, ca: number) => (ri >= 0 && ca >= 0 && s.dp[ri]?.[ca] >= 0 ? s.dp[ri][ca] : '—');
  const done = s.dp[n][s.amount] >= 0;
  const ans = done ? s.dp[n][s.amount] : '…';

  const rail = (
    <>
      <RailGroup label="cell">
        <RailStat k="i,a" v={s.cur ? `[${i}][${a}]` : '—'} />
        <RailStat k="coin" v={coin ?? '—'} tone="accent" />
        <RailStat k="skip" v={i >= 1 ? cell(i - 1, a) : '—'} />
        <RailStat k="use" v={i >= 1 && coin !== null && coin <= a ? cell(i, a - coin) : '—'} />
      </RailGroup>
      <RailResult label="ways" value={ans} tone={done ? 'good' : 'accent'} />
    </>
  );

  return (
    <VizStage rail={rail} railWidth={140}>
      <GridBoard grid={display} cellTone={cellTone} active={activeCell} cellSize={40} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CoinIIState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const n = s.coins.length;
  const cell = (i: number, a: number) => (i >= 0 && a >= 0 && s.dp[i]?.[a] >= 0 ? s.dp[i][a] : '—');
  const done = s.dp[n][s.amount] >= 0;
  const i = s.cur ? s.cur[0] : -1;
  const a = s.cur ? s.cur[1] : -1;
  const coin = i >= 1 ? s.coins[i - 1] : null;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `dp[${i}][${a}]` : '—'} />
      <InspectorRow k="coin" v={coin ?? '—'} />
      <InspectorRow k="skip = dp[i−1][a]" v={i >= 1 ? cell(i - 1, a) : '—'} />
      <InspectorRow k="use = dp[i][a−coin]" v={i >= 1 && coin !== null && coin <= a ? cell(i, a - coin) : '—'} />
      <InspectorRow k="answer" v={done ? `${s.dp[n][s.amount]} ways` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-60-coin-change-ii';
export const title = 'Coin Change II';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'c125', label: 'coins {1,2,5}, amount 5', value: { coins: [1, 2, 5], amount: 5 } },
    { id: 'c2', label: 'coins {2}, amount 3 (0 ways)', value: { coins: [2], amount: 3 } },
  ] satisfies SampleInput<CoinIIInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CoinIIState | undefined;
    const v = s ? s.dp[s.coins.length][s.amount] : 0;
    return { ok: true, label: `${v} ways` };
  },
};
