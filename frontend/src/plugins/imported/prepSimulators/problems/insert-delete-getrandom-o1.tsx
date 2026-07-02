import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type RsOp =
  | { kind: 'insert'; val: number }
  | { kind: 'remove'; val: number }
  | { kind: 'getRandom' };

interface RsInput {
  ops: RsOp[];
  /** Deterministic "random" index for getRandom demos. */
  randomIdx?: number;
}

interface RsState {
  nums: number[];
  op: string;
  out: boolean | number | null;
  swapFrom: number | null;
  swapTo: number | null;
  active: number | null;
  done: boolean;
}

function record({ ops, randomIdx = 0 }: RsInput): Frame<RsState>[] {  const nums: number[] = [];
  const idx = new Map<number, number>();

  const { emit, frames } = createRecorder<RsState>(() => ({
        nums: nums.slice(),
        op: '',
        out: null,
        swapFrom: null,
        swapTo: null,
        active: null,
        done: false
      }));

  emit(
    'INIT',
    'empty set',
    `RandomizedSet: map val→index plus dynamic array. Insert O(1), Remove swaps victim with last then pops, GetRandom picks random index in O(1).`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'insert') {
      if (idx.has(o.val)) {
        emit(
          'INSERT',
          `insert ${o.val} dup`,
          `Insert(${o.val}): already present → return false.`,
          { op: `insert ${o.val}`, out: false },
          'bad',
        );
        continue;
      }
      idx.set(o.val, nums.length);
      nums.push(o.val);
      emit(
        'INSERT',
        `insert ${o.val}`,
        `Insert(${o.val}): append at index ${nums.length - 1}, map[${o.val}]=${nums.length - 1} → return true.`,
        { op: `insert ${o.val}`, out: true, active: nums.length - 1 },
        'good',
      );
    } else if (o.kind === 'remove') {
      const i = idx.get(o.val);
      if (i === undefined) {
        emit(
          'REMOVE',
          `remove ${o.val} miss`,
          `Remove(${o.val}): not in map → return false.`,
          { op: `remove ${o.val}`, out: false },
          'bad',
        );
        continue;
      }
      const last = nums[nums.length - 1];
      const lastIdx = nums.length - 1;
      emit(
        'REMOVE',
        `swap ${o.val}`,
        `Remove(${o.val}) at index ${i}: swap with last element ${last} at index ${lastIdx} so deletion is O(1).`,
        { op: `remove ${o.val}`, swapFrom: i, swapTo: lastIdx, active: i },
      );
      nums[i] = last;
      idx.set(last, i);
      nums.pop();
      idx.delete(o.val);
      emit(
        'REMOVE',
        `removed ${o.val}`,
        `Pop last slot. Map no longer has ${o.val}. Array now [${nums.join(', ')}] → return true.`,
        { op: `remove ${o.val}`, out: true },
        'good',
      );
    } else {
      if (nums.length === 0) {
        emit('RANDOM', 'empty', `GetRandom on empty set — undefined in Go; demo skips.`, { op: 'getRandom' }, 'bad');
        continue;
      }
      const pick = randomIdx % nums.length;
      emit(
        'RANDOM',
        `pick idx ${pick}`,
        `GetRandom: choose index ${pick} uniformly → return nums[${pick}] = ${nums[pick]}. (Demo uses fixed index ${pick}.)`,
        { op: 'getRandom', out: nums[pick], active: pick },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `[${nums.join(',')}]`,
    `Done. Set holds {${nums.join(', ')}} with ${nums.length} element(s).`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RsState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        op = <span className="font-mono text-ink">{s.op || '—'}</span>
        {s.out !== null && (
          <>
            {' · '}result <span className="font-mono text-ink">{String(s.out)}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={s.nums.length ? s.nums.map(String) : ['—']}
        cellTone={(i) => (i === s.active ? 'match' : i === s.swapFrom || i === s.swapTo ? 'window' : '')}
        pointers={
          s.active !== null
            ? [{ i: s.active, label: 'idx', tone: 'accent', place: 'above' }]
            : []
        }
        windowRange={null}
        label={(i) => String(i)}
      />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="size" v={s.nums.length} />
      <InspectorRow k="result" v={s.out ?? '—'} />
      <InspectorRow k="array" v={s.nums.join(', ') || 'empty'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-insert-delete-getrandom-o1';
export const title = 'Insert Delete GetRandom O(1)';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rs1',
      label: 'insert 1,2,3 · remove 2 · random',
      value: {
        ops: [
          { kind: 'insert', val: 1 },
          { kind: 'insert', val: 2 },
          { kind: 'insert', val: 3 },
          { kind: 'remove', val: 2 },
          { kind: 'getRandom' },
        ],
        randomIdx: 0,
      },
    },
  ] satisfies SampleInput<RsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RsState | undefined;
    return s?.done ? { ok: true, label: `size ${s.nums.length}` } : { ok: false, label: 'incomplete' };
  },
};
