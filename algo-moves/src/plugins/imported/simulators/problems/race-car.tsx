import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface RaceInput {
  target: number;
}

interface RaceState {
  target: number;
  dp: number[]; // dp[t] = fewest A/R instructions to reach position t; INF = not yet decided
  t: number | null; // target position currently being decided
  from: number | null; // dp index reused by the winning plan
  done: boolean;
}

const INF = 1 << 30;

function record({ target }: RaceInput): Frame<RaceState>[] {
  const dp = new Array<number>(target + 1).fill(INF);
  const frames: Frame<RaceState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    t: number | null,
    from: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { target, dp: dp.slice(), t, from, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `target=${target}`,
    `Race Car: starting at position 0 with speed +1, find the fewest A (accelerate) / R (reverse) instructions to land exactly on ${target}. dp[t] = fewest instructions to reach position t, built up from t = 0.`,
    null,
    null,
  );

  dp[0] = 0;
  emit('BASE', 'dp[0]=0', `Base case: you already start at position 0, so dp[0] = 0 instructions.`, 0, null);

  for (let t = 1; t <= target; t++) {
    let best = INF;
    let bestFrom: number | null = null;

    // k accelerations move 2^k - 1 forward at speed 2^k.
    let k = 1;
    while ((1 << k) - 1 < t) {
      // Accelerate k times (overshoot would happen at k+1), then reverse,
      // then j extra accelerations the other way before reversing again.
      for (let j = 0; j < k; j++) {
        const rem = (1 << k) - 1 - ((1 << j) - 1);
        const cand = k + j + 2 + dp[t - rem];
        if (cand < best) {
          best = cand;
          bestFrom = t - rem;
        }
      }
      k++;
    }
    if ((1 << k) - 1 === t) {
      // Exactly reachable with k accelerations and no reverse.
      if (k < best) {
        best = k;
        bestFrom = 0;
      }
    } else {
      // Overshoot to 2^k - 1 with k accelerations, reverse once, solve the leftover.
      const cand = k + 1 + dp[(1 << k) - 1 - t];
      if (cand < best) {
        best = cand;
        bestFrom = (1 << k) - 1 - t;
      }
    }

    dp[t] = best;
    const reused = dp[bestFrom as number];
    emit(
      'FILL',
      `dp[${t}]=${best}`,
      bestFrom === 0
        ? `Position ${t} = 2^${k} − 1 exactly, so ${k} accelerations (${'A'.repeat(k)}) land on it: dp[${t}] = ${best}.`
        : `Best plan for position ${t}: a sequence of A/R moves reuses dp[${bestFrom}] (=${reused}); the extra instructions bring the total to dp[${t}] = ${best}.`,
      t,
      bestFrom,
    );
  }

  emit(
    'DONE',
    `${dp[target]} instructions`,
    `The table is full. dp[${target}] = ${dp[target]}, so the fewest A/R instructions to reach ${target} is ${dp[target]}.`,
    target,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RaceState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v >= INF ? '∞' : v));
  const pointers: ArrayPointer[] = [];
  if (s.t !== null) pointers.push({ i: s.t, label: 't', tone: 'accent', place: 'above' });
  if (s.from !== null) pointers.push({ i: s.from, label: 'reuses', tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.t === i ? 'found' : s.dp[i] < INF ? 'match' : '');
  const cell = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.dp.length ? (s.dp[idx] >= INF ? '∞' : s.dp[idx]) : '—';
  const done = s.dp[s.target] < INF;
  const ans = done ? s.dp[s.target] : '…';
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="t" v={s.t ?? '—'} tone="accent" />
        <RailStat k="dp[t]" v={cell(s.t)} />
        <RailStat k="reuses" v={s.from ?? '—'} tone="warn" />
        <RailStat k="dp[reuse]" v={cell(s.from)} />
      </RailGroup>
      <RailResult label="answer" value={ans} tone={done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RaceState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (idx: number) => (idx >= 0 && idx < s.dp.length ? (s.dp[idx] >= INF ? '∞' : s.dp[idx]) : '—');
  const done = s.dp[s.target] < INF;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="position t" v={s.t ?? '—'} />
      <InspectorRow k="reuses dp[..]" v={s.from ?? '—'} />
      <InspectorRow k="dp[reuse]" v={s.from !== null ? cell(s.from) : '—'} />
      <InspectorRow k="dp[t]" v={s.t !== null ? cell(s.t) : '—'} />
      <InspectorRow k="answer" v={done ? `${s.dp[s.target]} instructions` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-80-race-car';
export const title = 'Race Car';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 't6', label: 'target 6', value: { target: 6 } },
    { id: 't3', label: 'target 3', value: { target: 3 } },
  ] satisfies SampleInput<RaceInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as RaceState) ?? null;
    const v = s ? s.dp[s.target] : INF;
    return { ok: true, label: `${v} instructions` };
  },
};
