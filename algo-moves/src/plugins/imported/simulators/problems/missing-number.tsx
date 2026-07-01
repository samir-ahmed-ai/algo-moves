import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MissInput {
  nums: number[];
}

interface MissState {
  raw: number[];
  values: number[];
  base: number;
  lo: number;
  hi: number;
  mid: number | null;
  result: number | null;
  done: boolean;
}

function record({ nums }: MissInput): Frame<MissState>[] {
  const frames: Frame<MissState>[] = [];
  const raw = nums.slice();
  const values = nums.slice().sort((a, b) => a - b);
  const base = values[0];
  let lo = 0;
  let hi = values.length - 1;
  let result: number | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    mid: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { raw, values, base, lo, hi, mid, result, done: tone != null },
    });

  emit(
    'SORT',
    `sorted [${values.join(',')}]`,
    `Sort the input [${raw.join(',')}] to [${values.join(',')}]. In a complete run each values[i] would equal base+i (here base=${base}), so binary-search for the first index where that breaks.`,
    null,
  );

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const expected = base + mid;
    emit(
      'MID',
      `mid=${mid} exp=${expected}`,
      `Middle of the live window: mid=${mid}. Expected base+mid = ${base}+${mid} = ${expected}; actual values[${mid}] = ${values[mid]}.`,
      mid,
    );
    if (mid > 0 && values[mid - 1] === base + mid - 1 && values[mid] !== expected) {
      result = expected;
      emit(
        'GAP',
        `missing ${expected}`,
        `values[${mid - 1}] = ${values[mid - 1]} is correct but values[${mid}] = ${values[mid]} skips past ${expected}, so the gap is exactly here — the missing number is ${expected}.`,
        mid,
        'good',
      );
      return frames;
    }
    if (values[mid] === expected) {
      lo = mid + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `values[${mid}] = ${expected} matches, so everything up to mid is intact — the gap must be to the right. Set lo = ${lo}.`,
        mid,
      );
    } else {
      hi = mid - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `values[${mid}] = ${values[mid]} ≠ ${expected}, so the gap is at or before mid — search the left half. Set hi = ${hi}.`,
        mid,
      );
    }
  }

  result = base + lo;
  emit(
    'DONE',
    `missing ${result}`,
    `The search settled at lo=${lo}, so the first missing value is base+lo = ${base}+${lo} = ${result}.`,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MissState>) {
  const s = frame.state;
  const live = s.lo <= s.hi;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.mid === i) return 'mid';
    if (live && i >= s.lo && i <= s.hi) return '';
    return 'dead';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sorted · missing = <span className="font-mono text-ink">{s.result ?? '…'}</span>
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} label={(i) => s.base + i} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MissState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="input" v={`[${s.raw.join(',')}]`} />
      <InspectorRow k="base" v={s.base} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="result" v={s.result !== null ? s.result : '…searching'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-52-missing-number';
export const title = 'Missing Number';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'm1', label: '[3,0,1]', value: { nums: [3, 0, 1] } },
    { id: 'm2', label: '[0,1]', value: { nums: [0, 1] } },
    { id: 'm3', label: '[9,6,4,2,3,5,7,0,1]', value: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1] } },
  ] satisfies SampleInput<MissInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MissState | undefined;
    return s && s.result !== null
      ? { ok: true, label: `missing ${s.result}` }
      : { ok: false, label: '—' };
  },
};
