import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface LISInput {
  nums: number[];
}

interface LISState {
  nums: number[];
  dp: number[]; // 0 = not yet filled
  i: number | null; // index currently being decided
  from: number | null; // the j whose dp value won (the predecessor), or null
  best: number; // running answer = max(dp) so far
  done: boolean;
}

function record({ nums }: LISInput): Frame<LISState>[] {
  const n = nums.length;
  const dp = new Array<number>(n).fill(0);
  const { emit, frames } = createRecorder<LISState>(() => ({
    nums: nums,
    dp: dp.slice(),
    i: null,
    from: null,
    best: 0,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Longest Increasing Subsequence on nums = [${nums.join(', ')}]. dp[i] = the length of the longest increasing subsequence that ends at index i; the answer is the largest dp value.`,
    { i: null, from: null, best: 0 },
  );

  let best = 0;
  for (let i = 0; i < n; i++) {
    let cur = 1; // a single element is itself an LIS of length 1
    let from: number | null = null;
    for (let j = 0; j < i; j++) {
      if (nums[j]! < nums[i]! && dp[j]! + 1 > cur) {
        cur = dp[j]! + 1;
        from = j;
      }
    }
    dp[i] = cur;
    if (cur > best) best = cur;

    const caption =
      from === null
        ? `nums[${i}] = ${nums[i]}: no earlier element is smaller (or none extends past length 1), so it starts a new chain — dp[${i}] = 1.`
        : `nums[${i}] = ${nums[i]}: the best smaller predecessor is nums[${from}] = ${nums[from]} with dp[${from}] = ${dp[from]}, so dp[${i}] = dp[${from}] + 1 = ${cur}.`;
    emit('FILL', `dp[${i}]=${cur}`, caption, { i: i, from: from, best: best });
  }

  emit(
    'DONE',
    `LIS = ${best}`,
    `Every cell is filled. The answer is max(dp) = ${best}, the length of the longest increasing subsequence in [${nums.join(', ')}].`,
    { i: null, from: null, best: best, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LISState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === 0 ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null)
    pointers.push({ i: s.i, label: `i (=${s.nums[s.i]})`, tone: 'accent', place: 'above' });
  if (s.from !== null)
    pointers.push({ i: s.from, label: `j (=${s.nums[s.from]})`, tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] !== 0 ? 'match' : '');
  const dpJ = s.from !== null && s.dp[s.from] !== 0 ? s.dp[s.from] : '—';
  const dpI = s.i !== null && s.dp[s.i] !== 0 ? s.dp[s.i] : '—';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="i" v={s.i ?? '—'} />
            <RailStat k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} tone="accent" />
            <RailStat k="j" v={s.from ?? '—'} />
            <RailStat k="dp[j]" v={dpJ} />
            <RailStat k="dp[i]" v={dpI} />
            <RailStat k="best" v={s.best || '—'} />
          </RailGroup>
          <RailResult label="LIS" value={s.done ? s.best : '…'} tone={s.done ? 'good' : 'accent'} />
        </>
      }
    >
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LISState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number | null) => (i !== null && s.dp[i] !== 0 ? s.dp[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="index i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="predecessor j" v={s.from ?? '—'} />
      <InspectorRow k="dp[j]" v={cell(s.from)} />
      <InspectorRow k="dp[i]" v={cell(s.i)} />
      <InspectorRow k="best so far" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'imp-66-longest-increasing-subsequence';
export const title = 'Longest Increasing Subsequence';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'lis8',
      label: '[10, 9, 2, 5, 3, 7, 101, 18]',
      value: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
    },
    { id: 'lis6', label: '[0, 1, 0, 3, 2, 3]', value: { nums: [0, 1, 0, 3, 2, 3] } },
  ] satisfies SampleInput<LISInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as LISState) ?? null;
    const v = s ? s.best : 0;
    return { ok: true, label: `LIS = ${v}` };
  },
};
