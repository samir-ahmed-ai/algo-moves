import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface KnapInput {
  weights: number[];
  values: number[];
  capacity: number;
}

interface KnapState {
  weights: number[];
  values: number[];
  capacity: number;
  dp: number[][]; // (n+1) × (capacity+1); -1 = not yet filled
  cur: [number, number] | null; // [i, w] in dp coords
  done: boolean;
}

function record({ weights, values, capacity }: KnapInput): Frame<KnapState>[] {
  const n = weights.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(capacity + 1).fill(-1));
  const { emit, frames } = createRecorder<KnapState>(() => ({
        weights: weights,
        values: values,
        capacity: capacity,
        dp: dp.map((r) => r.slice()),
        cur: null,
        done: false
      }));

  emit('INIT', `${n} items, cap ${capacity}`, `0/1 Knapsack: pick a subset of items (each used at most once) to maximize value within capacity ${capacity}. dp[i][w] = the best value using only the first i items within capacity w. Rows are items (weights {${weights.join(', ')}}, values {${values.join(', ')}}); columns are capacity 0..${capacity}.`, { cur: null });

  // Base row: zero items → value 0 for every capacity.
  for (let w = 0; w <= capacity; w++) dp[0][w] = 0;
  emit('BASE', 'row 0 = 0', `Base case: with 0 items there is nothing to pack, so dp[0][w] = 0 for every capacity w from 0 to ${capacity}.`, { cur: [0, capacity] });

  for (let i = 1; i <= n; i++) {
    const wt = weights[i - 1];
    const val = values[i - 1];
    for (let w = 0; w <= capacity; w++) {
      const skip = dp[i - 1][w];
      if (wt <= w) {
        const take = dp[i - 1][w - wt] + val;
        dp[i][w] = Math.max(skip, take);
        const tookIt = take >= skip;
        emit('FILL', `dp[${i}][${w}]=${dp[i][w]}`, `Item ${i} (weight ${wt}, value ${val}) fits in capacity ${w}: skip it for dp[${i - 1}][${w}] = ${skip}, or take it for dp[${i - 1}][${w - wt}] + ${val} = ${take}. dp[${i}][${w}] = max(${skip}, ${take}) = ${dp[i][w]}${tookIt ? ' (take it)' : ' (skip it)'}.`, { cur: [i, w] });
      } else {
        dp[i][w] = skip;
        emit('FILL', `dp[${i}][${w}]=${dp[i][w]}`, `Item ${i} (weight ${wt}) is too heavy for capacity ${w}, so we must skip it: dp[${i}][${w}] = dp[${i - 1}][${w}] = ${skip}.`, { cur: [i, w] });
      }
    }
  }

  const ans = dp[n][capacity];
  emit('DONE', `value ${ans}`, `The table is full. dp[${n}][${capacity}] = ${ans}, so the best value we can pack within capacity ${capacity} is ${ans}.`, { cur: [n, capacity] , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<KnapState>) {
  const s = frame.state;
  const n = s.weights.length;
  // Augmented display: header row (capacities 0..cap) + header column (item label).
  const display: (number | string)[][] = [];
  const head: (number | string)[] = ['i \\ w'];
  for (let w = 0; w <= s.capacity; w++) head.push(w);
  display.push(head);
  for (let i = 0; i <= n; i++) {
    const rowLabel = i === 0 ? '∅' : `w${s.weights[i - 1]} v${s.values[i - 1]}`;
    const row: (number | string)[] = [rowLabel];
    for (let w = 0; w <= s.capacity; w++) row.push(s.dp[i][w] < 0 ? '' : s.dp[i][w]);
    display.push(row);
  }

  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'visited'; // headers
    const i = r - 1;
    const w = c - 1;
    if (s.cur && s.cur[0] === i && s.cur[1] === w) return 'active';
    if (i === n && w === s.capacity) return 'path';
    return s.dp[i][w] >= 0 ? 'visited' : '';
  };

  const activeCell: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const done = s.dp[n][s.capacity] >= 0;
  const ans = done ? s.dp[n][s.capacity] : null;
  const i = s.cur ? s.cur[0] : -1;
  const w = s.cur ? s.cur[1] : -1;
  const wt = i >= 1 ? s.weights[i - 1] : null;
  const val = i >= 1 ? s.values[i - 1] : null;
  const skip = i >= 1 && w >= 0 && s.dp[i - 1]?.[w] >= 0 ? s.dp[i - 1][w] : null;
  const take = i >= 1 && wt !== null && wt <= w && s.dp[i - 1]?.[w - wt] >= 0 ? s.dp[i - 1][w - wt] + s.values[i - 1] : null;
  const rail = (
    <>
      {s.cur && (
        <RailGroup label="cell">
          <RailStat k="i" v={i} tone="accent" />
          <RailStat k="w" v={w} tone="accent" />
          <RailStat k="wt" v={wt ?? '—'} />
          <RailStat k="val" v={val ?? '—'} />
          <RailStat k="skip" v={skip ?? '—'} />
          <RailStat k="take" v={take ?? '—'} />
        </RailGroup>
      )}
      <RailResult label="answer" value={ans !== null ? ans : '…'} tone={done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={112}>
      <GridBoard grid={display} cellTone={cellTone} active={activeCell} cellSize={40} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<KnapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const n = s.weights.length;
  const cell = (i: number, w: number) =>
    i >= 0 && w >= 0 && s.dp[i]?.[w] >= 0 ? s.dp[i][w] : '—';
  const done = s.dp[n][s.capacity] >= 0;
  const i = s.cur ? s.cur[0] : -1;
  const w = s.cur ? s.cur[1] : -1;
  const wt = i >= 1 ? s.weights[i - 1] : null;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `dp[${i}][${w}]` : '—'} />
      <InspectorRow k="item weight" v={wt ?? '—'} />
      <InspectorRow k="item value" v={i >= 1 ? s.values[i - 1] : '—'} />
      <InspectorRow k="skip = dp[i−1][w]" v={i >= 1 ? cell(i - 1, w) : '—'} />
      <InspectorRow
        k="take = dp[i−1][w−wt]+v"
        v={i >= 1 && wt !== null && wt <= w && s.dp[i - 1]?.[w - wt] >= 0 ? s.dp[i - 1][w - wt] + s.values[i - 1] : '—'}
      />
      <InspectorRow k="answer" v={done ? `value ${s.dp[n][s.capacity]}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-63-0-1-knapsack';
export const title = '0/1 Knapsack';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'classic',
      label: 'w{1,3,4,5} v{1,4,5,7}, cap 7',
      value: { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 },
    },
    {
      id: 'small',
      label: 'w{1,2,3} v{6,10,12}, cap 5',
      value: { weights: [1, 2, 3], values: [6, 10, 12], capacity: 5 },
    },
  ] satisfies SampleInput<KnapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KnapState | undefined;
    const v = s ? s.dp[s.weights.length][s.capacity] : 0;
    return { ok: true, label: `value ${v}` };
  },
};
