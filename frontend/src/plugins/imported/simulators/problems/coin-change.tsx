import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CoinInput {
  coins: number[];
  amount: number;
}

interface CoinState {
  coins: number[];
  amount: number;
  dp: number[]; // Infinity = unreachable
  a: number | null;
  from: number | null;
  coin: number | null;
  done: boolean;
}

const INF = Infinity;

function record({ coins, amount }: CoinInput): Frame<CoinState>[] {
  const dp = new Array<number>(amount + 1).fill(INF);

  const { emit, frames } = createRecorder<CoinState>(() => ({
    coins,
    amount,
    dp: dp.slice(),
    a: null,
    from: null,
    coin: null,
    done: false,
  }));

  const snap = (
    type: string,
    note: string,
    caption: string,
    a: number | null,
    from: number | null,
    coin: number | null,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { a, from, coin, done: type === 'DONE' }, tone);

  snap(
    'INIT',
    `amount=${amount}`,
    `Coin Change: the fewest coins from {${coins.join(', ')}} that sum to ${amount}. dp[a] = the minimum coins needed to make amount a, built up from a = 0.`,
    null,
    null,
    null,
  );

  dp[0] = 0;
  snap('BASE', 'dp[0]=0', `Base case: making amount 0 needs 0 coins. dp[0] = 0.`, 0, null, null);

  for (let a = 1; a <= amount; a++) {
    let best = INF;
    let bestFrom: number | null = null;
    let bestCoin: number | null = null;
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < best) {
        best = dp[a - c] + 1;
        bestFrom = a - c;
        bestCoin = c;
      }
    }
    dp[a] = best;
    const reach = best === INF;
    snap(
      reach ? 'UNREACHABLE' : 'FILL',
      reach ? `dp[${a}]=∞` : `dp[${a}]=${best}`,
      reach
        ? `No coin lands on amount ${a} from an already-reachable amount, so dp[${a}] stays ∞ (unreachable for now).`
        : `Best for amount ${a}: take a ${bestCoin}-coin on top of dp[${a - (bestCoin as number)}] (=${dp[a - (bestCoin as number)]}), so dp[${a}] = ${dp[bestFrom as number]} + 1 = ${best}.`,
      a,
      bestFrom,
      bestCoin,
    );
  }

  const answer = dp[amount] === INF ? -1 : dp[amount];
  snap(
    'DONE',
    answer < 0 ? 'no solution' : `${answer} coins`,
    answer < 0
      ? `dp[${amount}] is still ∞: amount ${amount} can't be formed from {${coins.join(', ')}}, so the answer is -1.`
      : `The table is full. dp[${amount}] = ${answer}, so the fewest coins to make ${amount} is ${answer}.`,
    amount,
    null,
    null,
    answer < 0 ? 'bad' : 'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CoinState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === INF ? '∞' : v));
  const pointers: ArrayPointer[] = [];
  if (s.a !== null) pointers.push({ i: s.a, label: 'a', tone: 'accent', place: 'above' });
  if (s.from !== null) pointers.push({ i: s.from, label: `a−${s.coin}`, tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.a === i ? 'found' : s.dp[i] !== INF ? 'match' : '');
  const reachable = s.dp[s.amount] !== INF;
  const answerKnown = reachable || s.done;
  const ans = reachable ? s.dp[s.amount] : s.done ? '−1' : '…';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="amount a" v={s.a ?? '—'} tone="accent" />
            <RailStat k="coin" v={s.coin ?? '—'} />
            <RailStat k="from dp[a−coin]" v={s.from !== null ? cells[s.from] : '—'} />
          </RailGroup>
          <RailResult
            label="answer"
            value={ans}
            tone={answerKnown ? (reachable ? 'good' : 'bad') : 'accent'}
          />
        </>
      }
    >
      <div className={cn(vizText.sm, 'text-ink3')}>
        coins {`{${s.coins.join(', ')}}`} → amount {s.amount}
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>index = amount, value = fewest coins</div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CoinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number) => (i >= 0 && i < s.dp.length ? (s.dp[i] === INF ? '∞' : s.dp[i]) : '—');
  const known = s.dp[s.amount] !== INF || s.done;
  return (
    <VarGrid>
      <InspectorRow k="coins" v={`{${s.coins.join(', ')}}`} />
      <InspectorRow k="amount a" v={s.a ?? '—'} />
      <InspectorRow k="winning coin" v={s.coin ?? '—'} />
      <InspectorRow k="dp[a−coin]" v={s.from !== null ? cell(s.from) : '—'} />
      <InspectorRow k="dp[a]" v={s.a !== null ? cell(s.a) : '—'} />
      <InspectorRow k="answer" v={known ? (s.dp[s.amount] === INF ? '−1' : `${s.dp[s.amount]} coins`) : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-59-coin-change';
export const title = 'Coin Change';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'c134', label: 'coins {1,3,4}, amount 6', value: { coins: [1, 3, 4], amount: 6 } },
    { id: 'c25', label: 'coins {2}, amount 3 (no solution)', value: { coins: [2], amount: 3 } },
  ] satisfies SampleInput<CoinInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as CoinState) ?? null;
    const v = s ? s.dp[s.amount] : INF;
    return v === INF ? { ok: false, label: 'no solution' } : { ok: true, label: `${v} coins` };
  },
};
