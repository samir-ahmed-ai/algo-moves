import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface PermInput {
  nums: number[];
}

interface PermState {
  nums: number[];
  used: boolean[]; // which pool indices are already in the path
  cur: number[]; // the permutation being built
  pick: number | null; // index just placed at the next position
  results: number[][];
  done: boolean;
}

function record({ nums }: PermInput): Frame<PermState>[] {  const used: boolean[] = nums.map(() => false);
  const cur: number[] = [];
  const results: number[][] = [];

  const { emit, frames } = createRecorder<PermState>(() => ({
        nums: nums.slice(),
        used: used.slice(),
        cur: cur.slice(),
        results: results.map((r) => r.slice()),
        pick: null,
        done: false
      }));

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));

  emit('INIT', `${nums.length}! perms`, `Generate every ordering of ${fmt(nums)}. A used[] flag marks elements already placed; at each position pick any unused element, recurse, then unmark it to free that branch. There are ${nums.length}! = ${fact(nums.length)} permutations.`, { pick: null });

  const btPerm = () => {
    if (cur.length === nums.length) {
      results.push(cur.slice());
      emit('RECORD', `+${fmt(cur)}`, `All ${nums.length} positions filled — record the permutation ${fmt(cur)} (${results.length} so far).`, { pick: null }, 'good');
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(nums[i]);
      emit('CHOOSE', `place ${nums[i]}`, `Place nums[${i}] = ${nums[i]} at position ${cur.length - 1} and recurse on the remaining elements. cur = ${fmt(cur)}.`, { pick: i });
      btPerm();
      cur.pop();
      used[i] = false;
      emit('BACKTRACK', `free ${nums[i]}`, `Backtrack: free nums[${i}] = ${nums[i]} so a different element can take position ${cur.length}. cur = ${fmt(cur)}.`, { pick: i });
    }
  };

  btPerm();
  emit('DONE', `${results.length} perms`, `All orderings explored — ${results.length} permutations of ${fmt(nums)}.`, { pick: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<PermState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.pick !== null) pointers.push({ i: s.pick, label: 'pick', tone: 'warn', place: 'above' });
  const tone = (i: number) => {
    if (s.pick === i) return 'mid';
    if (s.used[i]) return 'match';
    return '';
  };
  return (
    <VizStage
      rail={<>
        <RailGroup label="current">
          <RailStat k="cur" v={`[${s.cur.join(', ')}]`} tone="accent" />
          <RailStat k="pick" v={s.pick !== null ? s.nums[s.pick] : '—'} />
        </RailGroup>
        <RailStack label="results" items={s.results.map((r) => `[${r.join(', ')}]`)} />
        {s.done && <RailResult label="found" value={s.results.length} tone="good" />}
      </>}
    >
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PermState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  return (
    <VarGrid>
      <InspectorRow k="nums" v={`[${s.nums.join(', ')}]`} />
      <InspectorRow k="current" v={`[${s.cur.join(', ')}]`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target n!" v={fact(s.nums.length)} />
    </VarGrid>
  );
}

export const manifestId = 'imp-41-permutations';
export const title = 'Permutations';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '123', label: 'nums=[1,2,3]', value: { nums: [1, 2, 3] } },
    { id: '12', label: 'nums=[1,2]', value: { nums: [1, 2] } },
  ] satisfies SampleInput<PermInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PermState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} perms` };
  },
};
