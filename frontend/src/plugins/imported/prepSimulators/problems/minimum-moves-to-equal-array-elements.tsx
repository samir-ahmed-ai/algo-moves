import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MinMovesInput {
  nums: number[];
}

interface MinMovesState {
  nums: number[];
  i: number | null; // current index being scanned
  sum: number; // running sum so far
  min: number | null; // running minimum so far
  minIdx: number | null; // index where the running minimum lives
  reducedIdx: number | null; // index whose "distance to min" we are counting in the tally phase
  contribution: number | null; // nums[reducedIdx] - min for this element
  moves: number; // running total of moves
  scanning: boolean; // true during the sum/min pass, false during the tally pass
  done: boolean;
}

function record({ nums }: MinMovesInput): Frame<MinMovesState>[] {
  const { emit, frames } = createRecorder<MinMovesState>(() => ({
        nums,
        i: null,
        sum: 0,
        min: null,
        minIdx: null,
        reducedIdx: null,
        contribution: null,
        moves: 0,
        scanning: true,
        done: false
      }));

  emit(
    'INIT',
    `n=${nums.length}`,
    `Minimum Moves to Equal Array Elements: one move adds 1 to n−1 elements. Adding to everyone-but-one is the same as subtracting 1 from that one element, so the answer is the total number of single decrements needed to pull every element down to the minimum: sum − n·min.`,
    {},
  );

  // Pass 1: compute running sum and running minimum (mirrors the Go loop).
  let sum = 0;
  let min = nums[0];
  let minIdx = 0;
  emit(
    'SEED',
    `min=${min}`,
    `Seed the minimum with the first element: min = nums[0] = ${min}. We will refine it as we scan.`,
    { i: 0, sum: 0, min, minIdx },
  );

  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    sum += x;
    if (x < min) {
      min = x;
      minIdx = i;
      emit(
        'SCAN',
        `min→${min}`,
        `nums[${i}] = ${x} is smaller than the current minimum, so min drops to ${min} (at index ${i}). Running sum is now ${sum}.`,
        { i, sum, min, minIdx },
      );
    } else {
      emit(
        'SCAN',
        `sum=${sum}`,
        `Add nums[${i}] = ${x} to the running sum → ${sum}. It is not below the current minimum (${min}), so min stays.`,
        { i, sum, min, minIdx },
      );
    }
  }

  emit(
    'SCANDONE',
    `sum=${sum}, min=${min}`,
    `Scan complete: sum = ${sum}, min = ${min} (at index ${minIdx}). Now tally how many single decrements it takes to bring each element down to ${min}.`,
    { sum, min, minIdx, scanning: false },
  );

  // Pass 2 (illustrative tally): each element contributes (nums[i] - min) decrements.
  // This sums to sum - n*min, exactly the Go formula.
  let moves = 0;
  for (let i = 0; i < nums.length; i++) {
    const contribution = nums[i] - min;
    moves += contribution;
    emit(
      'TALLY',
      `+${contribution} → ${moves}`,
      `nums[${i}] = ${nums[i]} is ${contribution} above the minimum ${min}, so it needs ${contribution} decrement${contribution === 1 ? '' : 's'}. Running moves = ${moves}.`,
      {
        i: null,
        sum,
        min,
        minIdx,
        reducedIdx: i,
        contribution,
        moves,
        scanning: false,
      },
    );
  }

  const answer = sum - nums.length * min;
  emit(
    'DONE',
    `${answer} moves`,
    `Every element is now level with the minimum. Total = sum − n·min = ${sum} − ${nums.length}·${min} = ${answer}. That is the minimum number of moves.`,
    { sum, min, minIdx, moves, scanning: false, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MinMovesState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.reducedIdx !== null) pointers.push({ i: s.reducedIdx, label: 'gap', tone: 'warn', place: 'above' });
  if (s.minIdx !== null) pointers.push({ i: s.minIdx, label: 'min', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.minIdx === i && (!s.scanning || s.done)) return 'found';
    if (s.reducedIdx === i) return 'match';
    if (s.i === i) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sum = <span className="font-mono text-ink">{s.sum}</span>
        {' · '}min = <span className="font-mono text-ink">{s.min ?? '—'}</span>
        {' · '}n = <span className="font-mono text-ink">{s.nums.length}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.scanning
          ? 'phase: scan for sum + min'
          : s.done
            ? `answer = sum − n·min = ${s.sum} − ${s.nums.length}·${s.min} = ${s.moves}`
            : `phase: tally decrements → moves = ${s.moves}`}
      </div>
      {s.contribution !== null && !s.done && (
        <div className={cn('mt-1 font-mono text-ink2', vizText.sm)}>
          gap here = {s.contribution}
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.moves} moves</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinMovesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.nums.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="min" v={s.min ?? '—'} />
      <InspectorRow k="gap (nums[i]−min)" v={s.contribution ?? '—'} />
      <InspectorRow k="moves" v={s.moves} />
      <InspectorRow k="answer" v={s.done ? `${s.moves} moves` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-minimum-moves-to-equal-array-elements';
export const title = 'Minimum Moves to Equal Array Elements';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mm1', label: '[1,2,3] → 3', value: { nums: [1, 2, 3] } },
    { id: 'mm2', label: '[1,1,2,4] → 4', value: { nums: [1, 1, 2, 4] } },
  ] satisfies SampleInput<MinMovesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinMovesState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const answer = s.sum - s.nums.length * (s.min ?? 0);
    return { ok: true, label: `${answer} moves` };
  },
};
