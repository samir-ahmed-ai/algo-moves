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
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface PeakInput {
  values: number[];
}

interface PeakState {
  values: number[];
  lo: number;
  hi: number;
  mid: number | null;
  dead: boolean[];
  peak: number | null;
  done: boolean;
}

function record({ values }: PeakInput): Frame<PeakState>[] {
  const n = values.length;
  const dead = new Array<boolean>(n).fill(false);
  let lo = 0;
  let hi = n - 1;
  let peak: number | null = null;

  const { emit, frames } = createRecorder<PeakState>(() => ({
    values: values,
    lo: lo,
    hi: hi,
    dead: dead.slice(),
    peak: peak,
    mid: null,
    done: false,
  }));
  const emitDone = (
    type: string,
    note: string,
    caption: string,
    partial: Partial<PeakState>,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { ...partial, done: true }, tone);

  emit(
    'INIT',
    `lo=0 hi=${hi}`,
    `Find any peak (an element greater than both neighbours) in [${values.join(', ')}]. Treat out-of-bounds as -∞. At each step compare values[mid] with values[mid+1]: walk uphill toward a peak. The slope guarantees one always exists in the chosen half.`,
    { mid: null },
  );

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    emit(
      'MID',
      `mid=${mid}`,
      `Middle of the live window: mid=${mid}, value ${values[mid]}. Compare with its right neighbour values[${mid + 1}] = ${values[mid + 1]}.`,
      { mid: mid },
    );
    if (values[mid] > values[mid + 1]) {
      for (let i = mid + 1; i <= hi; i++) dead[i] = true;
      hi = mid;
      emit(
        'LEFT',
        `hi=${hi}`,
        `values[${mid}] = ${values[mid]} > values[${mid + 1}] = ${values[mid + 1]}: the slope goes down to the right, so a peak sits at mid or to its left. Set hi = ${hi}.`,
        { mid: mid },
      );
    } else {
      for (let i = lo; i <= mid; i++) dead[i] = true;
      lo = mid + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `values[${mid}] = ${values[mid]} < values[${mid + 1}] = ${values[mid + 1]}: the slope rises to the right, so a peak lies strictly to the right. Set lo = ${lo}.`,
        { mid: mid },
      );
    }
  }

  peak = lo;
  emitDone(
    'DONE',
    `peak @${peak}`,
    `lo and hi met at index ${lo} (value ${values[lo]}) — a peak. Return index ${peak}.`,
    { mid: lo },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PeakState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
  pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  const tone = (i: number) => {
    if (s.peak === i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="window">
        <RailStat k="lo" v={s.lo} tone="accent" />
        <RailStat k="hi" v={s.hi} tone="bad" />
        <RailStat k="mid" v={s.mid ?? '—'} tone={s.mid !== null ? 'warn' : undefined} />
      </RailGroup>
      {s.done && s.peak !== null && (
        <RailResult label="peak" value={`[${s.peak}]=${s.values[s.peak]}`} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PeakState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow
        k="result"
        v={s.peak !== null ? `index ${s.peak} (value ${s.values[s.peak]})` : '…searching'}
      />
    </VarGrid>
  );
}

export const manifestId = 'imp-54-find-peak-element';
export const title = 'Find Peak Element';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'p1', label: '[1,2,1,3,5,6,4]', value: { values: [1, 2, 1, 3, 5, 6, 4] } },
    { id: 'p2', label: '[1,2,3,1]', value: { values: [1, 2, 3, 1] } },
  ] satisfies SampleInput<PeakInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PeakState | undefined;
    return s && s.peak !== null
      ? { ok: true, label: `index ${s.peak} (value ${s.values[s.peak]})` }
      : { ok: false, label: 'no peak' };
  },
};
