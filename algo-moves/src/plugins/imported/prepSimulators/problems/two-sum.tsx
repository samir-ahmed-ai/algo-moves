import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayPatternInspector, ArrayPatternView, type ArrayPointer } from '../../../_shared/arrayPatterns';
import { RailGroup, RailStat, RailResult, RailStack, VizEmpty } from '../../../_shared/vizKit';

interface TwoSumInput {
  nums: number[];
  target: number;
}

interface TwoSumState {
  nums: number[];
  target: number;
  i: number | null; // current index
  need: number | null; // target - nums[i], the complement we look up
  seen: [number, number][]; // value -> index entries stored so far
  hit: number | null; // index the complement was found at
  result: [number, number] | null;
  done: boolean;
}

function record({ nums, target }: TwoSumInput): Frame<TwoSumState>[] {
  const seen = new Map<number, number>();
  const { emit, frames } = createRecorder<TwoSumState>(() => ({
    nums,
    target,
    i: null,
    need: null,
    seen: [...seen.entries()],
    hit: null,
    result: null,
    done: false,
  }));

  emit('INIT', `target=${target}`, `Two Sum: find two indices whose values add up to ${target}. Walk the array once, remembering each value in a hash map so we can look back for the complement target − v.`, {});

  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    const need = target - v;
    emit('SCAN', `need ${need}`, `At index ${i} the value is ${v}, so we need its complement ${target} − ${v} = ${need}. Is ${need} already in the map?`, { i, need });
    if (seen.has(need)) {
      const j = seen.get(need)!;
      emit('FOUND', `${j},${i}`, `Yes — ${need} was stored at index ${j}. nums[${j}] + nums[${i}] = ${nums[j]} + ${v} = ${target}. Return [${j}, ${i}].`, { i, need, hit: j, result: [j, i], done: true }, 'good');
      return frames;
    }
    seen.set(v, i);
    emit('STORE', `seen[${v}]=${i}`, `${need} is not in the map yet, so remember the current value: seen[${v}] = ${i}. Move on.`, { i, need });
  }

  emit('DONE', 'no pair', `Scanned the whole array with no complement match — there is no pair that sums to ${target}.`, { done: true }, 'bad');
  return frames;
}

function View({ frame }: PluginViewProps<TwoSumState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.hit !== null) pointers.push({ i: s.hit, label: 'j', tone: 'good', place: 'below' });
  const tone = (i: number) =>
    s.result && (i === s.result[0] || i === s.result[1]) ? 'found' : s.i === i ? 'match' : '';
  const seenItems = s.seen.map(([v, idx]) => `${v}:${idx}`);
  return (
    <ArrayPatternView
      values={s.nums}
      pointers={pointers}
      cellTone={tone}
      rail={
        <>
          <RailStack label="seen" items={seenItems} />
          <RailGroup label="scan">
            <RailStat k="target" v={s.target} />
            <RailStat k="i" v={s.i ?? '—'} tone="accent" />
            <RailStat k="need" v={s.need ?? '—'} />
          </RailGroup>
          {s.done && (
            <RailResult
              label="answer"
              value={s.result ? `[${s.result[0]}, ${s.result[1]}]` : 'none'}
              tone={s.result ? 'good' : 'bad'}
            />
          )}
        </>
      }
    />
  );
}

function Inspector({ frame }: InspectorProps<TwoSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <ArrayPatternInspector
      rows={[
        ['target', s.target],
        ['i', s.i ?? '—'],
        ['nums[i]', s.i !== null ? s.nums[s.i] : '—'],
        ['need (target−v)', s.need ?? '—'],
        ['map size', s.seen.length],
        ['result', s.result ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'],
      ]}
    />
  );
}

export const manifestId = 'prep-arrays-two-sum';
export const title = 'Two sum';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ts1', label: '[2,7,11,15] → 9', value: { nums: [2, 7, 11, 15], target: 9 } },
    { id: 'ts2', label: '[3,2,4] → 6', value: { nums: [3, 2, 4], target: 6 } },
  ] satisfies SampleInput<TwoSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TwoSumState | undefined;
    return s?.result ? { ok: true, label: `[${s.result.join(',')}]` } : { ok: false, label: 'no pair' };
  },
};
