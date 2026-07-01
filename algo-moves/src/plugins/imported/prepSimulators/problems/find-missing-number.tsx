import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MissingInput {
  nums: number[];
}

interface MissingState {
  nums: number[];
  n: number;
  i: number | null; // current index being folded in
  xorAll: number; // running accumulator
  prev: number; // accumulator before this step (for the caption/inspector)
  contrib: number | null; // i ^ v folded in this step
  result: number | null;
  done: boolean;
}

function record({ nums }: MissingInput): Frame<MissingState>[] {
  const frames: Frame<MissingState>[] = [];
  const n = nums.length;
  let xorAll = n;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<MissingState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        nums,
        n,
        i: null,
        xorAll,
        prev: xorAll,
        contrib: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `xorAll=${n}`,
    `Find Missing Number: the array holds n distinct values from 0..n with exactly one gap. XOR is self-cancelling (x ^ x = 0), so if we XOR every index 0..n together with every value, each present number pairs off and vanishes — leaving only the missing one. Seed the accumulator with n = ${n} (the one index that has no cell). Time O(n), Space O(1).`,
    { xorAll },
  );

  for (let i = 0; i < n; i++) {
    const v = nums[i];
    const contrib = i ^ v;
    const prev = xorAll;
    xorAll ^= i ^ v;
    emit(
      'FOLD',
      `^= ${i}^${v}`,
      `Index ${i} holds value ${v}. Fold both in: xorAll ^= ${i} ^ ${v} (= ${contrib}). ${prev} ^ ${contrib} = ${xorAll}. Every number that IS present will get XORed an even number of times overall and cancel to 0.`,
      { i, xorAll, prev, contrib },
    );
  }

  emit(
    'DONE',
    `missing ${xorAll}`,
    `All indices and values are folded in. Everything cancelled except the number that never appeared as a value — the accumulator is ${xorAll}, so the missing number is ${xorAll}.`,
    { xorAll, prev: xorAll, result: xorAll, done: true, i: null },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MissingState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · values 0..{s.n} with one gap
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.base, 'text-ink')}>
        xorAll = <span className="text-accent">{s.xorAll}</span>
      </div>
      {s.i !== null && s.contrib !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          {s.prev} ^ ({s.i} ^ {s.nums[s.i]} = {s.contrib}) = {s.xorAll}
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ missing = {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MissingState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (len)" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="i ^ v" v={s.contrib ?? '—'} />
      <InspectorRow k="xorAll" v={s.xorAll} />
      <InspectorRow k="missing" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-find-missing-number';
export const title = 'Find missing number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fmn1', label: '[3,0,1] → 2', value: { nums: [3, 0, 1] } },
    { id: 'fmn2', label: '[0,1,3,4] → 2', value: { nums: [0, 1, 3, 4] } },
  ] satisfies SampleInput<MissingInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MissingState | undefined;
    return s && s.result !== null
      ? { ok: true, label: `missing = ${s.result}` }
      : { ok: false, label: 'no result' };
  },
};
