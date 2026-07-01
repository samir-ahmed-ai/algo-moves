import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ nums }: SubsetsInput): Frame<SubsetsState>[] {
  const frames: Frame<SubsetsState>[] = [];
  const cur: number[] = [];
  const results: number[][] = [];

  const emit = (type: string, note: string, caption: string, pick: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { nums: nums.slice(), cur: cur.slice(), pick, results: results.map((r) => r.slice()), done: type === 'DONE' },
    });

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit(
    'INIT',
    `2^${nums.length} subsets`,
    `Generate every subset of ${fmt(nums)}. Start-index recursion: record the current path at every call, then for each later element include it and recurse. Undoing the last include explores the branch that skips it. There are 2^${nums.length} = ${2 ** nums.length} subsets.`,
    null,
  );

  const btSubsets = (idx: number) => {
    results.push(cur.slice());
    emit('RECORD', `+${fmt(cur)}`, `Every call records its path first — add the subset ${fmt(cur)} (${results.length} so far).`, null, 'good');
    for (let i = idx; i < nums.length; i++) {
      cur.push(nums[i]);
      emit('CHOOSE', `pick ${nums[i]}`, `Include nums[${i}] = ${nums[i]} and recurse on indices past ${i}. cur = ${fmt(cur)}.`, i);
      btSubsets(i + 1);
      cur.pop();
      emit('BACKTRACK', `undo ${nums[i]}`, `Backtrack: drop nums[${i}] = ${nums[i]} so the next sibling can be included instead. cur = ${fmt(cur)}.`, i);
    }
  };

  btSubsets(0);
  emit('DONE', `${results.length} subsets`, `All include/skip branches explored — ${results.length} subsets of ${fmt(nums)}.`, null, 'good');
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        subset so far = <span className="font-mono text-ink">[{s.cur.join(', ')}]</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        subsets found ({s.results.length})
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

export const simulator: DpSimulator = {
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
