import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<PartState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    processed: number,
    justAdded: number | null,
    bestSum: number | null,
    answer: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { nums, total, reach: reach.slice(), processed, justAdded, bestSum, done: type === 'DONE', answer },
    });

  emit(
    'INIT',
    `total=${total}`,
    `Partition Array to Minimize Sum Difference: split [${nums.join(', ')}] into two groups so |sum(A) − sum(B)| is smallest. Core idea — subset-sum: reach[s] marks every sum a subset can hit. Then the best split puts a subset of sum s on one side, giving difference |${total} − 2s|. Start with reach[0] = ✓ (the empty subset).`,
    0,
    null,
    null,
    null,
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
      k + 1,
      x,
      null,
      null,
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
    nums.length,
    null,
    bestSum,
    best,
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
  const answer = s.answer !== null ? s.answer : '…filling';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        nums [{s.nums.join(', ')}], total {s.total}, min difference = <span className="font-mono text-ink">{answer}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>index = subset sum, ✓ = reachable; answer = min |total − 2·sum|</div>
    </div>
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

export const simulator: DpSimulator = {
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
