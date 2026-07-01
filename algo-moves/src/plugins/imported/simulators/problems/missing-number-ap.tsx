import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface ApInput {
  values: number[];
}

interface ApState {
  values: number[];
  diff: number;
  lo: number;
  hi: number;
  mid: number | null;
  expected: number | null;
  result: number | null;
  dead: boolean[];
  done: boolean;
}

function record({ values }: ApInput): Frame<ApState>[] {
  const frames: Frame<ApState>[] = [];
  const n = values.length;
  const dead = new Array<boolean>(n).fill(false);
  const diff = (values[n - 1] - values[0]) / n;
  let lo = 0;
  let hi = n - 1;

  const emit = (
    type: string,
    note: string,
    caption: string,
    mid: number | null,
    expected: number | null,
    result: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, diff, lo, hi, mid, expected, result, dead: dead.slice(), done: tone != null },
    });

  emit(
    'INIT',
    `d=${diff}`,
    `The complete progression would step by d = (${values[n - 1]} − ${values[0]}) / ${n} = ${diff}. Cell i should hold ${values[0]} + i·${diff}. Binary-search the first index whose value has slipped off that expected line — the gap sits just before it.`,
    null,
    null,
    null,
  );

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const expected = values[0] + mid * diff;
    if (values[mid] === expected) {
      // progression still intact up to mid → the break is to the right
      for (let i = lo; i <= mid; i++) dead[i] = true;
      lo = mid + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `arr[${mid}] = ${values[mid]} matches the expected ${expected}, so every term up to index ${mid} is on the line. The missing term is further right: set lo = ${lo}.`,
        mid,
        expected,
        null,
      );
    } else {
      // arr[mid] is already shifted → the break is at or before mid
      for (let i = mid; i <= hi; i++) dead[i] = true;
      hi = mid - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `arr[${mid}] = ${values[mid]} but the line expects ${expected}, so the gap is at or before index ${mid}. Set hi = ${hi}.`,
        mid,
        expected,
        null,
      );
    }
  }

  const result = values[0] + lo * diff;
  emit(
    'DONE',
    `missing=${result}`,
    `lo settled at index ${lo}: the first slot whose value drifted off the line. The missing term is ${values[0]} + ${lo}·${diff} = ${result}.`,
    null,
    null,
    result,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ApState>) {
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
    if (s.dead[i]) return 'dead';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="search">
        <RailStat k="d" v={s.diff} />
        <RailStat k="lo" v={s.lo} tone="accent" />
        <RailStat k="hi" v={s.hi} tone="bad" />
        <RailStat k="mid" v={s.mid ?? '—'} tone="warn" />
        <RailStat k="exp" v={s.expected ?? '—'} />
      </RailGroup>
      {s.result !== null && <RailResult label="missing" value={s.result} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ApState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="diff" v={s.diff} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="arr[mid]" v={s.mid !== null ? s.values[s.mid] : '—'} />
      <InspectorRow k="expected" v={s.expected ?? '—'} />
      <InspectorRow k="missing" v={s.result ?? '…searching'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-51-missing-number-in-arithmetic-progression';
export const title = 'Missing Number in Arithmetic Progression';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ap1', label: '[5,7,11,13] (d=2)', value: { values: [5, 7, 11, 13] } },
    { id: 'ap2', label: '[15,13,12] (d=-1)', value: { values: [15, 13, 12] } },
  ] satisfies SampleInput<ApInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ApState | undefined;
    return s && s.result !== null ? { ok: true, label: `missing = ${s.result}` } : { ok: false, label: '—' };
  },
};
