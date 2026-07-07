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
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface PartInput {
  nums: number[];
}

interface PartState {
  nums: number[];
  total: number;
  reach: boolean[]; // reach[s] = some subset sums to s
  processed: number; // how many numbers folded in so far
  justAdded: number | null; // the number just processed (highlight pointer)
  bestSum: number | null; // the subset sum that minimises the difference
  done: boolean;
  answer: number | null; // minimised |total - 2*s|
}

function record({ nums }: PartInput): Frame<PartState>[] {
  const total = nums.reduce((acc, x) => acc + x, 0);
  const reach = new Array<boolean>(total + 1).fill(false);
  reach[0] = true;
  const { emit, frames } = createRecorder<PartState>(() => ({
    nums: nums,
    total: total,
    reach: reach.slice(),
    processed: 0,
    justAdded: null,
    bestSum: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `total=${total}`,
    `Partition Array to Minimize Sum Difference: split [${nums.join(', ')}] into two groups so |sum(A) − sum(B)| is smallest. Core idea — subset-sum: reach[s] marks every sum a subset can hit. Then the best split puts a subset of sum s on one side, giving difference |${total} − 2s|. Start with reach[0] = ✓ (the empty subset).`,
    { processed: 0, justAdded: null, bestSum: null, answer: null },
  );

  for (let k = 0; k < nums.length; k++) {
    const x = nums[k];
    // 0/1 knapsack reachable update, iterate high→low so each number is used once.
    for (let s = total; s >= x; s--) {
      if (reach[s - x]) reach[s] = true;
    }
    const hits = reach.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    emit(
      'FILL',
      `+${x}`,
      `Fold in ${x}: every previously reachable sum s also makes s + ${x} reachable. Reachable subset sums are now {${hits.join(', ')}}.`,
      { processed: k + 1, justAdded: x, bestSum: null, answer: null },
    );
  }

  // Minimise |total - 2s| over reachable s.
  let best = Infinity;
  let bestSum = 0;
  for (let s = 0; s <= total; s++) {
    if (reach[s]) {
      const d = Math.abs(total - 2 * s);
      if (d < best) {
        best = d;
        bestSum = s;
      }
    }
  }
  emit(
    'DONE',
    `diff ${best}`,
    `Scan reachable sums for the one closest to half of ${total}: subset sum ${bestSum} gives |${total} − 2·${bestSum}| = ${best}. So the minimum partition difference is ${best}.`,
    { processed: nums.length, justAdded: null, bestSum: bestSum, answer: best, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PartState>) {
  const s = frame.state;
  const cells = s.reach.map((b) => (b ? '✓' : '·'));
  const pointers: ArrayPointer[] = [];
  if (s.done && s.bestSum !== null) {
    pointers.push({ i: s.bestSum, label: `s=${s.bestSum}`, tone: 'good', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.done && s.bestSum === i) return 'found';
    return s.reach[i] ? 'match' : '';
  };
  const count = s.reach.reduce((acc, b) => acc + (b ? 1 : 0), 0);
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="folded" v={`${s.processed}/${s.nums.length}`} />
        <RailStat k="cur" v={s.justAdded ?? '—'} tone="accent" />
        <RailStat k="reach" v={count} />
      </RailGroup>
      {s.bestSum !== null && (
        <RailGroup label="best">
          <RailStat k="s" v={s.bestSum} tone="accent" />
        </RailGroup>
      )}
      <RailResult
        label="diff"
        value={s.answer !== null ? s.answer : '…'}
        tone={s.done ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PartState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const count = s.reach.reduce((acc, b) => acc + (b ? 1 : 0), 0);
  return (
    <VarGrid>
      <InspectorRow k="nums" v={`[${s.nums.join(', ')}]`} />
      <InspectorRow k="total" v={s.total} />
      <InspectorRow k="numbers folded in" v={`${s.processed}/${s.nums.length}`} />
      <InspectorRow k="just added" v={s.justAdded ?? '—'} />
      <InspectorRow k="reachable sums" v={count} />
      <InspectorRow k="best subset sum" v={s.bestSum ?? '—'} />
      <InspectorRow k="answer" v={s.answer !== null ? `diff ${s.answer}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-79-partition-array-into-two-arrays-to-minimize-sum-';
export const title = 'Partition Array Into Two Arrays to Minimize Sum Difference';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'p3973', label: 'nums [3, 9, 7, 3] (total 22)', value: { nums: [3, 9, 7, 3] } },
  ] satisfies SampleInput<PartInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PartState | undefined;
    const v = s?.answer ?? 0;
    return { ok: true, label: `diff ${v}` };
  },
};
