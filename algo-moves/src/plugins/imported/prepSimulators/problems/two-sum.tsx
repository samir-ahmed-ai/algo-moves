import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<TwoSumState>[] = [];
  const seen = new Map<number, number>();
  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<TwoSumState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        nums,
        target,
        i: null,
        need: null,
        seen: [...seen.entries()],
        hit: null,
        result: null,
        done: false,
        ...s,
      },
    });

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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target = <span className="font-mono text-ink">{s.target}</span>
        {s.need !== null && !s.done && (
          <>
            {' · '}need ={' '}
            <span className="font-mono text-ink">{s.need}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        seen {'{'}
        {s.seen.map(([v, idx]) => `${v}:${idx}`).join(', ')}
        {'}'}
      </div>
      {s.result && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ [{s.result[0]}, {s.result[1]}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TwoSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="need (target−v)" v={s.need ?? '—'} />
      <InspectorRow k="map size" v={s.seen.length} />
      <InspectorRow k="result" v={s.result ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'} />
    </VarGrid>
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
