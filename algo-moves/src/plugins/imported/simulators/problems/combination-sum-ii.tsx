import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CombSumInput {
  candidates: number[];
  target: number;
}

interface CombSumState {
  pool: number[]; // sorted candidates
  cur: number[]; // values chosen on the current path
  remaining: number; // target minus what is chosen
  pick: number | null; // pool index just chosen
  results: number[][];
  done: boolean;
}

function record({ candidates, target }: CombSumInput): Frame<CombSumState>[] {
  const frames: Frame<CombSumState>[] = [];
  const pool = candidates.slice().sort((a, b) => a - b);
  const cur: number[] = [];
  const results: number[][] = [];

  const emit = (type: string, note: string, caption: string, pick: number | null, remaining: number, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { pool: pool.slice(), cur: cur.slice(), remaining, pick, results: results.map((r) => r.slice()), done: type === 'DONE' },
    });

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit(
    'INIT',
    `target ${target}`,
    `Find every combination of ${fmt(pool)} (sorted) summing to ${target}, using each element at most once. Pick distinct items left to right, subtracting from the target; record when it hits 0. Skipping an equal sibling (a[i] == a[i-1] at the same level) avoids duplicate combinations.`,
    null,
    target,
  );

  const btCombSum = (idx: number, remaining: number) => {
    if (remaining === 0) {
      results.push(cur.slice());
      emit('RECORD', `+${fmt(cur)}`, `remaining hit 0 — record the combination ${fmt(cur)} (${results.length} so far).`, null, 0, 'good');
      return;
    }
    for (let i = idx; i < pool.length && remaining >= pool[i]; i++) {
      if (i > idx && pool[i] === pool[i - 1]) continue;
      cur.push(pool[i]);
      emit('CHOOSE', `pick ${pool[i]}`, `Pick pool[${i}] = ${pool[i]}; remaining ${remaining} - ${pool[i]} = ${remaining - pool[i]}. cur = ${fmt(cur)}.`, i, remaining - pool[i]);
      btCombSum(i + 1, remaining - pool[i]);
      cur.pop();
      emit('BACKTRACK', `undo ${pool[i]}`, `Backtrack: remove pool[${i}] = ${pool[i]}, restoring remaining to ${remaining}, and try the next distinct value. cur = ${fmt(cur)}.`, i, remaining);
    }
  };

  btCombSum(0, target);
  emit('DONE', `${results.length} combos`, `All branches explored — ${results.length} combination${results.length === 1 ? '' : 's'} of ${fmt(pool)} summing to ${target}.`, null, target, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CombSumState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.pick !== null) pointers.push({ i: s.pick, label: 'pick', tone: 'warn', place: 'above' });
  // Mark the deepest occurrences contributing to cur (left-to-right, no reuse).
  const inCur = new Array(s.pool.length).fill(false);
  let j = 0;
  for (let i = 0; i < s.pool.length && j < s.cur.length; i++) {
    if (s.pool[i] === s.cur[j]) {
      inCur[i] = true;
      j++;
    }
  }
  const tone = (i: number) => {
    if (s.pick === i) return 'mid';
    if (inCur[i]) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        chosen = <span className="font-mono text-ink">[{s.cur.join(', ')}]</span> · remaining ={' '}
        <span className="font-mono text-ink">{s.remaining}</span>
      </div>
      <ArrayRow values={s.pool} cellTone={tone} pointers={pointers} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        combinations found ({s.results.length})
        <div className="mt-1 flex flex-col gap-0.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('font-mono text-ink', vizText.sm)}>
              [{r.join(', ')}]
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CombSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="pool (sorted)" v={`[${s.pool.join(', ')}]`} />
      <InspectorRow k="chosen" v={`[${s.cur.join(', ')}]`} />
      <InspectorRow k="remaining" v={s.remaining} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-29-combination-sum-ii';
export const title = 'Combination Sum II';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'classic', label: 'cand=[10,1,2,7,6,1,5], t=8', value: { candidates: [10, 1, 2, 7, 6, 1, 5], target: 8 } },
    { id: 'dups', label: 'cand=[2,5,2,1,2], t=5', value: { candidates: [2, 5, 2, 1, 2], target: 5 } },
  ] satisfies SampleInput<CombSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CombSumState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} combos` };
  },
};
