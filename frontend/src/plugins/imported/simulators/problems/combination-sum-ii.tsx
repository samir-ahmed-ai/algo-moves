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
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

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
  const pool = candidates.slice().sort((a, b) => a - b);
  const cur: number[] = [];
  const results: number[][] = [];

  const { emit, frames } = createRecorder<CombSumState>(() => ({
    pool: pool.slice(),
    cur: cur.slice(),
    results: results.map((r) => r.slice()),
    pick: null,
    remaining: 0,
    done: false,
  }));

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit(
    'INIT',
    `target ${target}`,
    `Find every combination of ${fmt(pool)} (sorted) summing to ${target}, using each element at most once. Pick distinct items left to right, subtracting from the target; record when it hits 0. Skipping an equal sibling (a[i] == a[i-1] at the same level) avoids duplicate combinations.`,
    { pick: null, remaining: target },
  );

  const btCombSum = (idx: number, remaining: number) => {
    if (remaining === 0) {
      results.push(cur.slice());
      emit(
        'RECORD',
        `+${fmt(cur)}`,
        `remaining hit 0 — record the combination ${fmt(cur)} (${results.length} so far).`,
        { pick: null, remaining: 0 },
        'good',
      );
      return;
    }
    for (let i = idx; i < pool.length && remaining >= pool[i]; i++) {
      if (i > idx && pool[i] === pool[i - 1]) continue;
      cur.push(pool[i]);
      emit(
        'CHOOSE',
        `pick ${pool[i]}`,
        `Pick pool[${i}] = ${pool[i]}; remaining ${remaining} - ${pool[i]} = ${remaining - pool[i]}. cur = ${fmt(cur)}.`,
        { pick: i, remaining: remaining - pool[i] },
      );
      btCombSum(i + 1, remaining - pool[i]);
      cur.pop();
      emit(
        'BACKTRACK',
        `undo ${pool[i]}`,
        `Backtrack: remove pool[${i}] = ${pool[i]}, restoring remaining to ${remaining}, and try the next distinct value. cur = ${fmt(cur)}.`,
        { pick: i, remaining: remaining },
      );
    }
  };

  btCombSum(0, target);
  emit(
    'DONE',
    `${results.length} combos`,
    `All branches explored — ${results.length} combination${results.length === 1 ? '' : 's'} of ${fmt(pool)} summing to ${target}.`,
    { pick: null, remaining: target, done: true },
    'good',
  );
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
  const resultItems = s.results.map((r) => `[${r.join(', ')}]`);
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="path">
            <RailStat k="chosen" v={s.cur.length ? `[${s.cur.join(', ')}]` : '[]'} tone="accent" />
            <RailStat k="remaining" v={s.remaining} />
          </RailGroup>
          <RailStack label="found" items={resultItems} highlightEnd="bottom" />
          {s.done && (
            <RailResult
              label="combos"
              value={s.results.length}
              tone={s.results.length > 0 ? 'good' : 'bad'}
            />
          )}
        </>
      }
      railWidth={150}
    >
      <ArrayRow values={s.pool} cellTone={tone} pointers={pointers} />
    </VizStage>
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

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'classic',
      label: 'cand=[10,1,2,7,6,1,5], t=8',
      value: { candidates: [10, 1, 2, 7, 6, 1, 5], target: 8 },
    },
    {
      id: 'dups',
      label: 'cand=[2,5,2,1,2], t=5',
      value: { candidates: [2, 5, 2, 1, 2], target: 5 },
    },
  ] satisfies SampleInput<CombSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CombSumState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} combos` };
  },
};
