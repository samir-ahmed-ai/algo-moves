import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';

interface SubarrayInput {
  nums: number[];
  k: number;
}

interface SubarrayState {
  nums: number[];
  k: number;
  i: number | null; // current index being scanned
  num: number | null; // nums[i]
  prefix: number | null; // running prefix sum mod k (normalised to [0,k))
  prev: number | null; // earlier index that shared this remainder
  map: [number, number][]; // remainder -> first index it appeared at
  window: [number, number] | null; // [prev+1, i] answer span
  result: boolean | null; // final answer
  done: boolean;
}

function record({ nums, k }: SubarrayInput): Frame<SubarrayState>[] {
  const modMap = new Map<number, number>([[0, -1]]);
  let prefix = 0;

  const { emit, frames } = createRecorder<SubarrayState>(() => ({
    nums,
    k,
    i: null,
    num: null,
    prefix: null,
    prev: null,
    map: [...modMap.entries()],
    window: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Continuous Subarray Sum: is there a subarray of length >= 2 whose sum is a multiple of ${k}? Key fact: sum(i+1..j) is a multiple of ${k} exactly when prefix[j] % ${k} == prefix[i] % ${k}. We seed the map with remainder 0 -> index -1 so a whole prefix that is itself a multiple counts.`,
    { prefix: 0 },
  );

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    prefix = (prefix + num) % k;
    if (prefix < 0) prefix += k;
    emit(
      'SCAN',
      `prefix%${k}=${prefix}`,
      `Add nums[${i}] = ${num} to the running sum and take it mod ${k}: remainder is ${prefix}. Have we seen this remainder before?`,
      { i, num, prefix },
    );

    if (modMap.has(prefix)) {
      const prev = modMap.get(prefix)!;
      if (i - prev >= 2) {
        emit(
          'FOUND',
          `[${prev + 1}..${i}]`,
          `Yes — remainder ${prefix} first appeared at index ${prev}, and ${i} − ${prev} = ${i - prev} >= 2. So nums[${prev + 1}..${i}] sums to a multiple of ${k}. Return true.`,
          { i, num, prefix, prev, window: [prev + 1, i], result: true, done: true },
          'good',
        );
        return frames;
      }
      emit(
        'TOOSHORT',
        `gap ${i - prev}<2`,
        `Remainder ${prefix} was last seen at index ${prev}, but ${i} − ${prev} = ${i - prev} < 2, so the subarray would have length 1. Keep the earlier index ${prev} (we want the first occurrence) and move on.`,
        { i, num, prefix, prev },
      );
    } else {
      modMap.set(prefix, i);
      emit(
        'STORE',
        `map[${prefix}]=${i}`,
        `Remainder ${prefix} is new — record map[${prefix}] = ${i} as its first occurrence so a later match can form a subarray back to here.`,
        { i, num, prefix },
      );
    }
  }

  emit(
    'DONE',
    'false',
    `Scanned every index without two equal remainders at least 2 apart — no subarray of length >= 2 sums to a multiple of ${k}. Return false.`,
    { result: false, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SubarrayState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'j', tone: 'accent', place: 'above' });
  if (s.prev !== null && s.prev >= 0)
    pointers.push({ i: s.prev, label: 'i', tone: 'good', place: 'below' });
  const tone = (i: number) => {
    if (s.window && i >= s.window[0] && i <= s.window[1]) return 'found';
    return s.i === i ? 'match' : '';
  };
  const mapItems = s.map.map(([rem, idx]) => `${rem}:${idx}`);
  return (
    <VizStage railWidth={150} rail={<>
      <RailGroup label="scan">
        <RailStat k="k" v={s.k} />
        <RailStat k="prefix%k" v={s.prefix ?? '—'} tone="accent" />
        <RailStat k="prev idx" v={s.prev ?? '—'} tone={s.prev !== null && s.prev >= 0 ? 'good' : undefined} />
      </RailGroup>
      <RailStack label="map (rem:idx)" items={mapItems} />
      {s.result !== null && (
        <RailResult
          label="answer"
          value={s.result ? 'true' : 'false'}
          tone={s.result ? 'good' : 'bad'}
        />
      )}
    </>}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={s.window} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SubarrayState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="j (index)" v={s.i ?? '—'} />
      <InspectorRow k="nums[j]" v={s.num ?? '—'} />
      <InspectorRow k="prefix % k" v={s.prefix ?? '—'} />
      <InspectorRow k="first seen at" v={s.prev ?? '—'} />
      <InspectorRow k="map size" v={s.map.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? '…' : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-prefix-sum-continuous-subarray-sum';
export const title = 'Continuous Subarray Sum';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'css1', label: '[23,2,4,6,7], k=6', value: { nums: [23, 2, 4, 6, 7], k: 6 } },
    { id: 'css2', label: '[23,2,6,4,7], k=13', value: { nums: [23, 2, 6, 4, 7], k: 13 } },
  ] satisfies SampleInput<SubarrayInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubarrayState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};
