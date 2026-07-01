import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SubarraySumInput {
  nums: number[];
  k: number;
}

interface SubarraySumState {
  nums: number[];
  k: number;
  i: number | null; // current index being processed
  sum: number; // running prefix sum up to and including i
  need: number | null; // sum - k, the earlier prefix we look up
  prefix: [number, number][]; // prefixSum value -> count of times it has occurred
  added: number | null; // how many subarrays this step contributed
  cnt: number; // total subarrays found so far
  done: boolean;
}

function record({ nums, k }: SubarraySumInput): Frame<SubarraySumState>[] {
  const frames: Frame<SubarraySumState>[] = [];
  const prefixMap = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let cnt = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<SubarraySumState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        nums,
        k,
        i: null,
        sum,
        need: null,
        prefix: [...prefixMap.entries()],
        added: null,
        cnt,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Subarray Sum Equals K: count subarrays summing to ${k}. Key idea — if prefix[j] − prefix[i] = ${k}, then the slice (i+1 .. j) sums to ${k}. We scan once, keeping a map of how many times each running prefix sum has occurred. Seed it with {0: 1} so a whole-prefix match counts.`,
    { sum: 0 },
  );

  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    const need = sum - k;
    emit(
      'SCAN',
      `sum=${sum}`,
      `At index ${i} (value ${nums[i]}) the running prefix sum becomes ${sum}. A subarray ending here sums to ${k} exactly when an earlier prefix equalled sum − k = ${sum} − ${k} = ${need}. Look up ${need} in the map.`,
      { i, sum, need },
    );

    const c = prefixMap.get(need) ?? 0;
    if (c > 0) {
      cnt += c;
      emit(
        'MATCH',
        `+${c}`,
        `${need} has appeared ${c} time${c === 1 ? '' : 's'} before, so there ${c === 1 ? 'is' : 'are'} ${c} subarray${c === 1 ? '' : 's'} ending at index ${i} that sum to ${k}. Add ${c} to the count → ${cnt}.`,
        { i, sum, need, added: c, cnt },
        'good',
      );
    } else {
      emit(
        'MISS',
        `+0`,
        `${need} is not in the map, so no subarray ending at index ${i} sums to ${k}. The count stays ${cnt}.`,
        { i, sum, need, added: 0, cnt },
      );
    }

    prefixMap.set(sum, (prefixMap.get(sum) ?? 0) + 1);
    emit(
      'STORE',
      `prefix[${sum}]=${prefixMap.get(sum)}`,
      `Record the current prefix sum so future indices can match against it: prefix[${sum}] is now ${prefixMap.get(sum)}.`,
      { i, sum },
    );
  }

  emit(
    'DONE',
    `${cnt} subarrays`,
    `Scan complete. ${cnt} subarray${cnt === 1 ? '' : 's'} sum to ${k}.`,
    { done: true, cnt },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SubarraySumState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}prefix sum ={' '}
        <span className="font-mono text-ink">{s.sum}</span>
        {s.need !== null && !s.done && (
          <>
            {' · '}need (sum−k) ={' '}
            <span className="font-mono text-ink">{s.need}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        prefix {'{'}
        {s.prefix.map(([v, c]) => `${v}:${c}`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        count = {s.cnt}
        {s.added !== null && s.added > 0 && !s.done && (
          <span className="text-good"> (+{s.added})</span>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SubarraySumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="prefix sum" v={s.sum} />
      <InspectorRow k="need (sum−k)" v={s.need ?? '—'} />
      <InspectorRow k="map[need]" v={s.added ?? '—'} />
      <InspectorRow k="map size" v={s.prefix.length} />
      <InspectorRow k="count" v={s.cnt} />
    </VarGrid>
  );
}

export const manifestId = 'prep-prefix-sum-subarray-sum-equals-k';
export const title = 'Subarray Sum Equals K';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ssk1', label: '[1,1,1], k=2', value: { nums: [1, 1, 1], k: 2 } },
    { id: 'ssk2', label: '[3,4,7,2,-3,1,4,2], k=7', value: { nums: [3, 4, 7, 2, -3, 1, 4, 2], k: 7 } },
  ] satisfies SampleInput<SubarraySumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubarraySumState | undefined;
    const cnt = s?.cnt ?? 0;
    return { ok: true, label: `${cnt} subarray${cnt === 1 ? '' : 's'}` };
  },
};
