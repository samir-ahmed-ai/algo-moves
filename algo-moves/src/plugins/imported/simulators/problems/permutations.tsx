import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ nums }: PermInput): Frame<PermState>[] {
  const frames: Frame<PermState>[] = [];
  const used: boolean[] = nums.map(() => false);
  const cur: number[] = [];
  const results: number[][] = [];

  const emit = (type: string, note: string, caption: string, pick: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { nums: nums.slice(), used: used.slice(), cur: cur.slice(), pick, results: results.map((r) => r.slice()), done: type === 'DONE' },
    });

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));

  emit(
    'INIT',
    `${nums.length}! perms`,
    `Generate every ordering of ${fmt(nums)}. A used[] flag marks elements already placed; at each position pick any unused element, recurse, then unmark it to free that branch. There are ${nums.length}! = ${fact(nums.length)} permutations.`,
    null,
  );

  const btPerm = () => {
    if (cur.length === nums.length) {
      results.push(cur.slice());
      emit('RECORD', `+${fmt(cur)}`, `All ${nums.length} positions filled — record the permutation ${fmt(cur)} (${results.length} so far).`, null, 'good');
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(nums[i]);
      emit('CHOOSE', `place ${nums[i]}`, `Place nums[${i}] = ${nums[i]} at position ${cur.length - 1} and recurse on the remaining elements. cur = ${fmt(cur)}.`, i);
      btPerm();
      cur.pop();
      used[i] = false;
      emit('BACKTRACK', `free ${nums[i]}`, `Backtrack: free nums[${i}] = ${nums[i]} so a different element can take position ${cur.length}. cur = ${fmt(cur)}.`, i);
    }
  };

  btPerm();
  emit('DONE', `${results.length} perms`, `All orderings explored — ${results.length} permutations of ${fmt(nums)}.`, null, 'good');
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
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        permutation so far = <span className="font-mono text-ink">[{s.cur.join(', ')}]</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        permutations found ({s.results.length})
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

export const simulator: DpSimulator = {
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
