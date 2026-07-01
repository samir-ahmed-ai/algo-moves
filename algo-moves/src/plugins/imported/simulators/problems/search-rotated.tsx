import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RotInput {
  values: number[];
  target: number;
}

interface RotState {
  values: number[];
  target: number;
  lo: number;
  hi: number;
  mid: number | null;
  found: number | null;
  dead: boolean[];
  done: boolean;
}

function record({ values, target }: RotInput): Frame<RotState>[] {
  const frames: Frame<RotState>[] = [];
  const dead = new Array<boolean>(values.length).fill(false);
  let lo = 0;
  let hi = values.length - 1;
  let found: number | null = null;

  const emit = (type: string, note: string, caption: string, mid: number | null, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, target, lo, hi, mid, found, dead: dead.slice(), done: tone != null },
    });

  emit(
    'INIT',
    `lo=0 hi=${hi}`,
    `Search for ${target} in a sorted array that was rotated at an unknown pivot. At each step one half [lo..mid] or [mid..hi] is still in sorted order — decide which, and whether the target lies inside it.`,
    null,
  );

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    emit('MID', `mid=${mid}`, `Middle of the live window: mid=${mid}, value ${values[mid]}.`, mid);
    if (values[mid] === target) {
      found = mid;
      emit('FOUND', `found @${mid}`, `values[${mid}] = ${target}. Found at index ${mid}.`, mid, 'good');
      return frames;
    }
    if (values[lo] <= values[mid]) {
      // left half [lo..mid] is sorted
      if (values[lo] <= target && target < values[mid]) {
        for (let i = mid; i <= hi; i++) dead[i] = true;
        hi = mid - 1;
        emit('LEFT', `hi=${hi}`, `[${lo}..${mid}] is sorted and ${values[lo]} ≤ ${target} < ${values[mid]}, so the target is in the left half. Set hi = ${hi}.`, mid);
      } else {
        for (let i = lo; i <= mid; i++) dead[i] = true;
        lo = mid + 1;
        emit('RIGHT', `lo=${lo}`, `The sorted left half ends at ${values[mid]} and doesn't contain ${target}, so search the right half. Set lo = ${lo}.`, mid);
      }
    } else {
      // right half [mid..hi] is sorted
      if (values[mid] < target && target <= values[hi]) {
        for (let i = lo; i <= mid; i++) dead[i] = true;
        lo = mid + 1;
        emit('RIGHT', `lo=${lo}`, `[${mid}..${hi}] is sorted and ${values[mid]} < ${target} ≤ ${values[hi]}, so the target is in the right half. Set lo = ${lo}.`, mid);
      } else {
        for (let i = mid; i <= hi; i++) dead[i] = true;
        hi = mid - 1;
        emit('LEFT', `hi=${hi}`, `[${mid}..${hi}] is sorted but ${target} is outside it, so search the left half. Set hi = ${hi}.`, mid);
      }
    }
  }

  emit('MISS', 'absent', `lo passed hi with no match — ${target} is not in the array. Return -1.`, null, 'bad');
  return frames;
}

function View({ frame }: PluginViewProps<RotState>) {
  const s = frame.state;
  const live = s.lo <= s.hi;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.found === i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        rotated · target = <span className="font-mono text-ink">{s.target}</span>
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RotState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="result" v={s.found !== null ? `index ${s.found}` : s.done ? '-1 (absent)' : '…searching'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-46-search-in-rotated-sorted-array';
export const title = 'Search in Rotated Sorted Array';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'r1', label: '[4,5,6,7,0,1,2], t=0', value: { values: [4, 5, 6, 7, 0, 1, 2], target: 0 } },
    { id: 'r2', label: '[4,5,6,7,0,1,2], t=3', value: { values: [4, 5, 6, 7, 0, 1, 2], target: 3 } },
  ] satisfies SampleInput<RotInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RotState | undefined;
    return s && s.found !== null ? { ok: true, label: `index ${s.found}` } : { ok: false, label: '-1 (absent)' };
  },
};
