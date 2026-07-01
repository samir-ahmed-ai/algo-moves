import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayBars, type BarTone } from '../../../../components/ArrayBars';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface TopKInput {
  nums: number[];
  k: number;
}

interface TopKState {
  nums: number[];
  k: number;
  // distinct elements (stable order of first appearance) and their counts
  elements: number[];
  counts: number[];
  // bucket index currently being scanned (freq level), null when not scanning
  scanFreq: number | null;
  // element index (into elements[]) currently highlighted, null otherwise
  active: number | null;
  // elements indices already collected into the result
  collected: number[];
  result: number[];
  done: boolean;
}

function record({ nums, k }: TopKInput): Frame<TopKState>[] {
  const frames: Frame<TopKState>[] = [];

  // Stable order of distinct elements by first appearance — used for the bars.
  const order: number[] = [];
  const freq = new Map<number, number>();
  for (const num of nums) {
    if (!freq.has(num)) order.push(num);
    freq.set(num, (freq.get(num) ?? 0) + 1);
  }
  const counts = order.map((e) => freq.get(e) ?? 0);
  const indexOfEl = new Map<number, number>();
  order.forEach((e, idx) => indexOfEl.set(e, idx));

  const collected: number[] = [];
  const result: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<TopKState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        nums,
        k,
        elements: order,
        counts,
        scanFreq: null,
        active: null,
        collected: [...collected],
        result: [...result],
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Top K Frequent Elements: return the ${k} value${k === 1 ? '' : 's'} that appear most often in the array. We count frequencies in O(n), then bucket-sort by count so we never need to sort the values themselves.`,
    {},
  );

  // Phase 1: build frequency counts (already computed; replay per distinct value).
  for (let idx = 0; idx < order.length; idx++) {
    emit(
      'COUNT',
      `freq[${order[idx]}]=${counts[idx]}`,
      `Counting pass: value ${order[idx]} appears ${counts[idx]} time${counts[idx] === 1 ? '' : 's'} in the array. Each bar's height is that element's frequency.`,
      { active: idx },
    );
  }

  // Phase 2: bucket sort by frequency. buckets[f] = elements with frequency f.
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (let idx = 0; idx < order.length; idx++) {
    buckets[counts[idx]].push(order[idx]);
  }
  emit(
    'BUCKETS',
    `0..${nums.length}`,
    `Bucket sort: place each element into buckets[freq], where the index is its frequency. There are at most n+1 = ${nums.length + 1} buckets, so this is O(n) — no comparison sort needed.`,
    {},
  );

  // Phase 3: walk buckets from highest frequency down, collecting up to k.
  for (let f = buckets.length - 1; f >= 0 && result.length < k; f--) {
    if (buckets[f].length === 0) continue;
    for (const num of buckets[f]) {
      const idx = indexOfEl.get(num) ?? -1;
      collected.push(idx);
      result.push(num);
      const reachedK = result.length === k;
      emit(
        'COLLECT',
        `take ${num}`,
        `Scanning buckets high → low at frequency ${f}: collect element ${num} (count ${f}). Result so far: [${result.join(', ')}]${reachedK ? ` — that's k = ${k}, stop.` : `, need ${k - result.length} more.`}`,
        { scanFreq: f, active: idx, done: reachedK },
        'good',
      );
      if (reachedK) {
        return frames;
      }
    }
  }

  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Walked every bucket. Fewer than k distinct values existed, so the answer is everything collected: [${result.join(', ')}].`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TopKState>) {
  const s = frame.state;
  const collectedSet = new Set(s.collected);
  const tone = (i: number): BarTone => {
    if (collectedSet.has(i)) return 'sorted';
    if (s.active === i) return 'compare';
    return 'idle';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {s.scanFreq !== null && !s.done && (
          <>
            {' · '}scanning freq ={' '}
            <span className="font-mono text-ink">{s.scanFreq}</span>
          </>
        )}
      </div>
      <ArrayBars
        values={s.counts}
        tone={tone}
        label={(i) => s.elements[i]}
        max={Math.max(1, ...s.counts)}
      />
      <div className={cn(vizText.sm, 'text-ink3')}>bar height = frequency · label = element value</div>
      {s.result.length > 0 && (
        <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
          result = [{s.result.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TopKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const el = s.active !== null && s.active >= 0 ? s.elements[s.active] : null;
  const cnt = s.active !== null && s.active >= 0 ? s.counts[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="distinct" v={s.elements.length} />
      <InspectorRow k="current element" v={el ?? '—'} />
      <InspectorRow k="its frequency" v={cnt ?? '—'} />
      <InspectorRow k="scanning freq" v={s.scanFreq ?? '—'} />
      <InspectorRow k="collected" v={s.result.length} />
      <InspectorRow k="result" v={s.result.length ? `[${s.result.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

function computeAnswer(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  const order: number[] = [];
  for (const num of nums) {
    if (!freq.has(num)) order.push(num);
    freq.set(num, (freq.get(num) ?? 0) + 1);
  }
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const num of order) buckets[freq.get(num) ?? 0].push(num);
  const res: number[] = [];
  for (let f = buckets.length - 1; f >= 0 && res.length < k; f--) {
    for (const num of buckets[f]) {
      res.push(num);
      if (res.length === k) return res;
    }
  }
  return res;
}

export const manifestId = 'prep-sorting-top-k-frequent-elements';
export const title = 'Top K Frequent Elements';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'tk1', label: '[1,1,1,2,2,3], k=2', value: { nums: [1, 1, 1, 2, 2, 3], k: 2 } },
    { id: 'tk2', label: '[4,1,4,2,2,2], k=1', value: { nums: [4, 1, 4, 2, 2, 2], k: 1 } },
  ] satisfies SampleInput<TopKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TopKState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const expected = computeAnswer(s.nums, s.k);
    const got = s.result;
    const ok = got.length === expected.length && got.every((v, i) => v === expected[i]);
    return { ok, label: `[${got.join(',')}]` };
  },
};
