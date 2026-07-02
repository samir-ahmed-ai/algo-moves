import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface FllInput {
  values: number[];
  target: number;
}

type Phase = 'first' | 'last';

interface FllState {
  values: number[];
  target: number;
  phase: Phase;
  lo: number;
  hi: number;
  mid: number | null;
  dead: boolean[];
  first: number | null;
  last: number | null;
  done: boolean;
}

function record({ values, target }: FllInput): Frame<FllState>[] {
  const n = values.length;
  const dead = new Array<boolean>(n).fill(false);
  let phase: Phase = 'first';
  let lo = 0;
  let hi = n - 1;
  let first: number | null = null;
  let last: number | null = null;

  const { emit, frames } = createRecorder<FllState>(() => ({
    values,
    target,
    phase,
    lo,
    hi,
    mid: null,
    dead: dead.slice(),
    first,
    last,
    done: false,
  }));

  emit(
    'INIT',
    `target=${target}`,
    `The array [${values.join(', ')}] is sorted, so equal values sit in one contiguous block. We run two binary searches: first the LOWER bound (leftmost index equal to ${target}), then the UPPER bound (rightmost). The answer is that [first, last] pair.`,
    { mid: null },
  );

  // ---- Phase 1: lower bound — leftmost index whose value == target ----
  emit('FIRST', `search lower bound`, `Phase 1 — searching for the FIRST position of ${target}. Whenever values[mid] ≥ ${target} we keep mid as a candidate and shrink right; otherwise we move past it.`, { mid: null });
  lo = 0;
  hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    emit('MID', `mid=${mid}`, `Lower-bound search: mid=${mid}, value ${values[mid]}.`, { mid });
    if (values[mid] < target) {
      for (let i = lo; i <= mid; i++) dead[i] = true;
      lo = mid + 1;
      emit('RIGHT', `lo=${lo}`, `values[${mid}] = ${values[mid]} < ${target}, so the first ${target} (if any) is strictly to the right. Set lo = ${lo}.`, { mid });
    } else {
      for (let i = mid + 1; i <= hi; i++) dead[i] = true;
      hi = mid;
      emit('LEFT', `hi=${hi}`, `values[${mid}] = ${values[mid]} ≥ ${target}, so index ${mid} could be the first one — keep it and discard everything to the right. Set hi = ${hi}.`, { mid });
    }
  }
  if (values[lo] === target) {
    first = lo;
    emit('FOUND', `first=${first}`, `Converged at index ${lo} with value ${values[lo]} = ${target}. The FIRST position is ${first}.`, { mid: lo });
  } else {
    emit('MISS', `absent`, `Converged at index ${lo} with value ${values[lo]} ≠ ${target}. The target ${target} is not in the array, so the answer is [-1, -1].`, { mid: lo, done: true }, 'bad');
    return frames;
  }

  // ---- Phase 2: upper bound — rightmost index whose value == target ----
  phase = 'last';
  dead.fill(false);
  lo = 0;
  hi = n - 1;
  emit('LAST', `search upper bound`, `Phase 2 — searching for the LAST position of ${target}. Reset the window. Whenever values[mid] ≤ ${target} we keep mid as a candidate and shrink left.`, { phase: 'last', mid: null });
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1; // bias right to avoid an infinite loop on lo = mid
    emit('MID', `mid=${mid}`, `Upper-bound search: mid=${mid}, value ${values[mid]}.`, { mid });
    if (values[mid] > target) {
      for (let i = mid; i <= hi; i++) dead[i] = true;
      hi = mid - 1;
      emit('LEFT', `hi=${hi}`, `values[${mid}] = ${values[mid]} > ${target}, so the last ${target} is strictly to the left. Set hi = ${hi}.`, { mid });
    } else {
      for (let i = lo; i < mid; i++) dead[i] = true;
      lo = mid;
      emit('RIGHT', `lo=${lo}`, `values[${mid}] = ${values[mid]} ≤ ${target}, so index ${mid} could be the last one — keep it and discard everything to the left. Set lo = ${lo}.`, { mid });
    }
  }
  last = lo;
  emit('DONE', `[${first}, ${last}]`, `Converged at index ${lo} with value ${values[lo]} = ${target}. The LAST position is ${last}. Final answer: [${first}, ${last}].`, { mid: lo, done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<FllState>) {
  const s = frame.state;
  const live = s.lo <= s.hi && !s.done;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live || s.done) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.done && s.phase === 'last' && s.first !== null && s.last !== null && i >= s.first && i <= s.last) return 'found';
    if (s.phase === 'last' && s.first === i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const result = s.first === null ? '[-1, -1]' : s.last === null ? `[${s.first}, …]` : `[${s.first}, ${s.last}]`;
  const resultTone = s.done ? (s.last !== null ? 'good' : 'bad') : 'accent';
  return (
    <VizStage rail={<>
      <RailGroup label="window">
        <RailStat k="lo" v={s.lo} tone="accent" />
        <RailStat k="hi" v={s.hi} tone="bad" />
        <RailStat k="mid" v={s.mid ?? '—'} tone="warn" />
      </RailGroup>
      <RailGroup label="phase">
        <RailStat k="phase" v={s.phase === 'first' ? 'lower' : 'upper'} />
        <RailStat k="target" v={s.target} />
      </RailGroup>
      <RailGroup label="bounds">
        <RailStat k="first" v={s.first ?? '—'} tone={s.first !== null ? 'good' : undefined} />
        <RailStat k="last" v={s.last ?? '—'} tone={s.last !== null ? 'good' : undefined} />
      </RailGroup>
      <RailResult label="answer" value={result} tone={resultTone} />
    </>}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FllState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const result = s.first === null ? '[-1, -1]' : s.last === null ? `first ${s.first}, last …` : `[${s.first}, ${s.last}]`;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="phase" v={s.phase === 'first' ? 'lower bound' : 'upper bound'} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="first" v={s.first ?? '—'} />
      <InspectorRow k="last" v={s.last ?? '—'} />
      <InspectorRow k="result" v={result} />
    </VarGrid>
  );
}

export const manifestId = 'imp-53-find-first-and-last-position-of-element-in-sorte';
export const title = 'Find First and Last Position of Element in Sorted Array';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'f1', label: '[5,7,7,8,8,10], t=8', value: { values: [5, 7, 7, 8, 8, 10], target: 8 } },
    { id: 'f2', label: '[5,7,7,8,8,10], t=6', value: { values: [5, 7, 7, 8, 8, 10], target: 6 } },
  ] satisfies SampleInput<FllInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FllState | undefined;
    if (s && s.first !== null && s.last !== null) return { ok: true, label: `[${s.first}, ${s.last}]` };
    return { ok: false, label: '[-1, -1]' };
  },
};
