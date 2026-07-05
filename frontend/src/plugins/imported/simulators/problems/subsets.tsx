import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface SubsetsInput {
  nums: number[];
}

interface SubsetsState {
  nums: number[];
  cur: number[]; // the subset being built (a path through the value pool)
  pick: number | null; // index of the value just included
  results: number[][];
  done: boolean;
}

function record({ nums }: SubsetsInput): Frame<SubsetsState>[] {  const cur: number[] = [];
  const results: number[][] = [];

  const { emit, frames } = createRecorder<SubsetsState>(() => ({
        nums: nums.slice(),
        cur: cur.slice(),
        results: results.map((r) => r.slice()),
        pick: null,
        done: false
      }));

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit('INIT', `2^${nums.length} subsets`, `Generate every subset of ${fmt(nums)}. Start-index recursion: record the current path at every call, then for each later element include it and recurse. Undoing the last include explores the branch that skips it. There are 2^${nums.length} = ${2 ** nums.length} subsets.`, { pick: null });

  const btSubsets = (idx: number) => {
    results.push(cur.slice());
    emit('RECORD', `+${fmt(cur)}`, `Every call records its path first — add the subset ${fmt(cur)} (${results.length} so far).`, { pick: null }, 'good');
    for (let i = idx; i < nums.length; i++) {
      cur.push(nums[i]);
      emit('CHOOSE', `pick ${nums[i]}`, `Include nums[${i}] = ${nums[i]} and recurse on indices past ${i}. cur = ${fmt(cur)}.`, { pick: i });
      btSubsets(i + 1);
      cur.pop();
      emit('BACKTRACK', `undo ${nums[i]}`, `Backtrack: drop nums[${i}] = ${nums[i]} so the next sibling can be included instead. cur = ${fmt(cur)}.`, { pick: i });
    }
  };

  btSubsets(0);
  emit('DONE', `${results.length} subsets`, `All include/skip branches explored — ${results.length} subsets of ${fmt(nums)}.`, { pick: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SubsetsState>) {
  const s = frame.state;
  const inCur = new Set(s.cur);
  const pointers: ArrayPointer[] = [];
  if (s.pick !== null) pointers.push({ i: s.pick, label: 'pick', tone: 'warn', place: 'above' });
  const tone = (i: number) => {
    if (s.pick === i) return 'mid';
    if (inCur.has(s.nums[i])) return 'match';
    return '';
  };
  const rail = (
    <>
      <RailStack label="cur subset" items={s.cur.map(String)} />
      <RailStack label="results" items={s.results.map((r) => `[${r.join(', ')}]`)} highlightEnd="bottom" topLabel="latest" />
      <RailGroup label="progress">
        <RailStat k="found" v={s.results.length} tone="accent" />
        <RailStat k="target" v={2 ** s.nums.length} />
      </RailGroup>
      {s.done && <RailResult label="subsets" value={s.results.length} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SubsetsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="nums" v={`[${s.nums.join(', ')}]`} />
      <InspectorRow k="current" v={`[${s.cur.join(', ')}]`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target 2^n" v={2 ** s.nums.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-26-subsets';
export const title = 'Subsets';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '123', label: 'nums=[1,2,3]', value: { nums: [1, 2, 3] } },
    { id: '12', label: 'nums=[1,2]', value: { nums: [1, 2] } },
  ] satisfies SampleInput<SubsetsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubsetsState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} subsets` };
  },
};
