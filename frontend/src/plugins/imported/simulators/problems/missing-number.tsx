import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  RailGroup,
  RailResult,
  RailStat,
  VarGrid,
  VizEmpty,
  VizStage,
} from '../../../_shared/vizKit';

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
  const raw = nums.slice();
  const values = nums.slice().sort((a, b) => a - b);
  const base = values[0]!;
  let lo = 0;
  let hi = values.length - 1;
  let result: number | null = null;

  const { emit, frames } = createRecorder<MissState>(() => ({
    raw: raw,
    values: values,
    base: base,
    lo: lo,
    hi: hi,
    result: result,
    mid: null,
    done: false,
  }));
  const emitDone = (
    type: string,
    note: string,
    caption: string,
    partial: Partial<MissState>,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { ...partial, done: true }, tone);

  emit(
    'SORT',
    `sorted [${values.join(',')}]`,
    `Sort the input [${raw.join(',')}] to [${values.join(',')}]. In a complete run each values[i] would equal base+i (here base=${base}), so binary-search for the first index where that breaks.`,
    { mid: null },
  );

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const expected = base! + mid;
    emit(
      'MID',
      `mid=${mid} exp=${expected}`,
      `Middle of the live window: mid=${mid}. Expected base+mid = ${base}+${mid} = ${expected}; actual values[${mid}] = ${values[mid]}.`,
      { mid: mid },
    );
    if (mid > 0 && values[mid - 1] === base! + mid - 1 && values[mid] !== expected) {
      result = expected;
      emitDone(
        'GAP',
        `missing ${expected}`,
        `values[${mid - 1}] = ${values[mid - 1]} is correct but values[${mid}] = ${values[mid]} skips past ${expected}, so the gap is exactly here — the missing number is ${expected}.`,
        { mid: mid },
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
        { mid: mid },
      );
    } else {
      hi = mid - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `values[${mid}] = ${values[mid]} ≠ ${expected}, so the gap is at or before mid — search the left half. Set hi = ${hi}.`,
        { mid: mid },
      );
    }
  }

  result = base! + lo;
  emitDone(
    'DONE',
    `missing ${result}`,
    `The search settled at lo=${lo}, so the first missing value is base+lo = ${base}+${lo} = ${result}.`,
    { mid: null },
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
    <VizStage
      rail={
        <>
          <RailGroup label="search">
            <RailStat k="lo" v={s.lo} tone="accent" />
            <RailStat k="hi" v={s.hi} tone="bad" />
            <RailStat k="mid" v={s.mid ?? '—'} tone="warn" />
          </RailGroup>
          <RailResult label="missing" value={s.result ?? '…'} tone={s.done ? 'good' : 'accent'} />
        </>
      }
    >
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} label={(i) => s.base + i} />
    </VizStage>
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

export const simulator: ProblemSimulator = {
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
