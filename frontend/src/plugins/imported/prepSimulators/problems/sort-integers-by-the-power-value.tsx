import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { ArrayBars, type BarTone } from '../../../../components/ArrayBars';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PowerValueInput {
  lo: number;
  hi: number;
  k: number;
}

interface PowerValueState {
  lo: number;
  hi: number;
  k: number;
  values: number[]; // the integers, in current (partially sorted) order
  powers: number[]; // Collatz power of values[i], aligned by index
  memo: [number, number][]; // memoized n -> power entries built so far
  // sort cursors (insertion sort)
  pos: number | null; // boundary: [0..pos) is sorted
  cursor: number | null; // index being compared/shifted during the inner loop
  inserted: number | null; // index where the key landed this pass
  result: number | null; // values[k-1] once sorted
  done: boolean;
}

function record({ lo, hi, k }: PowerValueInput): Frame<PowerValueState>[] {  const memo = new Map<number, number>();

  const power = (n: number): number => {
    if (n === 1) return 0;
    const cached = memo.get(n);
    if (cached !== undefined) return cached;
    const res = n % 2 === 0 ? 1 + power(n / 2) : 1 + power(3 * n + 1);
    memo.set(n, res);
    return res;
  };

  const values: number[] = [];
  for (let i = lo; i <= hi; i++) values.push(i);
  const powers = values.map((v) => power(v));

  const { emit, frames } = createRecorder<PowerValueState>(() => ({
        lo,
        hi,
        k,
        values: values.slice(),
        powers: powers.slice(),
        memo: [...memo.entries()],
        pos: null,
        cursor: null,
        inserted: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `[${lo}..${hi}], k=${k}`,
    `Sort Integers by The Power Value: list every integer in [${lo}, ${hi}], then sort them by Collatz power (the number of steps to reach 1, halving evens and doing 3n+1 on odds), breaking ties by the smaller value. The answer is the k-th element (k=${k}).`,
    {},
  );

  emit(
    'POWERS',
    `${values.length} powers`,
    `Each bar's height is the precomputed Collatz power of the integer beneath it. Memoization caches every n we touch, so each power is computed once. Now insertion-sort the integers by these heights, smallest power first.`,
    {},
  );

  // Insertion sort on `values`, keeping `powers` aligned. Comparison key is
  // (power, value), matching the Go sort.Slice comparator exactly.
  const less = (ai: number, bp: number, av: number, bv: number): boolean =>
    ai === bp ? av < bv : ai < bp;

  for (let i = 1; i < values.length; i++) {
    const keyVal = values[i];
    const keyPow = powers[i];
    emit(
      'PICK',
      `key ${keyVal} (p=${keyPow})`,
      `Pass ${i}: the sorted region is [0..${i}). Pick up ${keyVal} (power ${keyPow}) as the key and slide it left past anything with a larger (power, value).`,
      { pos: i, cursor: i, inserted: null },
    );

    let j = i - 1;
    while (j >= 0 && less(keyPow, powers[j], keyVal, values[j])) {
      emit(
        'SHIFT',
        `${values[j]} > ${keyVal}`,
        `${values[j]} has key (power ${powers[j]}, value ${values[j]}) which outranks the key (power ${keyPow}, value ${keyVal}), so shift ${values[j]} one slot right to make room.`,
        { pos: i, cursor: j },
      );
      values[j + 1] = values[j];
      powers[j + 1] = powers[j];
      j--;
    }
    values[j + 1] = keyVal;
    powers[j + 1] = keyPow;
    emit(
      'INSERT',
      `place ${keyVal}@${j + 1}`,
      `${j < 0 ? 'Reached the front' : `${values[j]} (power ${powers[j]}) ranks at or below the key`}, so drop ${keyVal} into slot ${j + 1}. The region [0..${i + 1}) is now sorted.`,
      { pos: i + 1, cursor: null, inserted: j + 1 },
    );
  }

  const result = values[k - 1];
  emit(
    'DONE',
    `answer ${result}`,
    `Fully sorted by (power, value). The k-th element (index ${k - 1}) is ${result} — that is the answer.`,
    { pos: values.length, cursor: null, inserted: k - 1, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PowerValueState>) {
  const s = frame.state;
  const tone = (i: number): BarTone => {
    if (s.done) return i === (s.result !== null ? s.k - 1 : -1) ? 'done' : 'sorted';
    if (s.inserted === i) return 'min';
    if (s.cursor === i) return 'compare';
    if (s.pos !== null && i < s.pos) return 'sorted';
    return 'idle';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        range <span className="font-mono text-ink">[{s.lo}..{s.hi}]</span>
        {' · '}k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}answer ={' '}
        <span className="font-mono text-ink">{s.result !== null ? s.result : '…'}</span>
      </div>
      <ArrayBars values={s.powers} tone={tone} label={(i) => s.values[i]} max={Math.max(1, ...s.powers)} />
      <div className={cn(vizText.xs, 'text-ink3')}>bar height = Collatz power · label = the integer</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PowerValueState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur =
    s.cursor !== null && s.cursor >= 0 && s.cursor < s.values.length
      ? `${s.values[s.cursor]} (p=${s.powers[s.cursor]})`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="range" v={`[${s.lo}..${s.hi}]`} />
      <InspectorRow k="count" v={s.values.length} />
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="sorted [0..pos)" v={s.pos ?? '—'} />
      <InspectorRow k="cursor" v={cur} />
      <InspectorRow k="memo size" v={s.memo.length} />
      <InspectorRow k="answer" v={s.result !== null ? s.result : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-sort-integers-by-the-power-value';
export const title = 'Sort Integers by The Power Value';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'pv1', label: 'lo=12, hi=15, k=2', value: { lo: 12, hi: 15, k: 2 } },
    { id: 'pv2', label: 'lo=7, hi=11, k=4', value: { lo: 7, hi: 11, k: 4 } },
  ] satisfies SampleInput<PowerValueInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PowerValueState | undefined;
    return s?.result != null
      ? { ok: true, label: `k-th = ${s.result}` }
      : { ok: false, label: 'unsorted' };
  },
};
