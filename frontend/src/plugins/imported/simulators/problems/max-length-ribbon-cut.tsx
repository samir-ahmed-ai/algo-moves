import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface RibInput {
  ribbons: number[];
  k: number;
}

interface RibState {
  /** Candidate lengths 1..max laid out as a number line; index i ⇒ length i+1. */
  values: number[];
  ribbons: number[];
  k: number;
  lo: number;
  hi: number;
  mid: number | null;
  count: number | null;
  result: number | null;
  dead: boolean[];
  done: boolean;
}

function pieces(ribbons: number[], len: number): number {
  let cnt = 0;
  for (const r of ribbons) cnt += Math.floor(r / len);
  return cnt;
}

function record({ ribbons, k }: RibInput): Frame<RibState>[] {  const max = Math.max(...ribbons);
  // index i represents candidate length L = i + 1, so values = [1..max]
  const values = Array.from({ length: max }, (_, i) => i + 1);
  const dead = new Array<boolean>(max).fill(false);
  let lo = 0; // length 1
  let hi = max - 1; // length max
  let result: number | null = null;

  const { emit, frames } = createRecorder<RibState>(() => ({
        values: values,
        ribbons: ribbons,
        k: k,
        lo: lo,
        hi: hi,
        result: result,
        dead: dead.slice(),
        mid: null,
        count: null,
        done: false
      }));
  const emitDone = (
    type: string,
    note: string,
    caption: string,
    partial: Partial<RibState>,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { ...partial, done: true }, tone);

  emit('INIT', `1..${max}`, `Binary-search the answer: the cut length L. A length L is feasible when the ribbons ${ribbons.join(' + ')} yield ⌊r/L⌋ pieces summing to at least k = ${k}. Longer L means fewer pieces, so feasibility is monotone — search [1..${max}] for the largest feasible L.`, { mid: null, count: null });

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const len = mid + 1;
    const count = pieces(ribbons, len);
    if (count >= k) {
      // feasible → record and reach for a longer length
      result = len;
      lo = mid + 1;
      emit('RIGHT', `lo=L${len + 1}`, `L = ${len} is feasible: ${ribbons.map((r) => Math.floor(r / len)).join(' + ')} = ${count} pieces ≥ ${k}. Record ${len} and try a longer cut: move lo past it.`, { mid: mid, count: count });
    } else {
      // infeasible → this length and everything longer is too few; kill [mid..hi]
      for (let i = mid; i <= hi; i++) dead[i] = true;
      hi = mid - 1;
      emit('LEFT', `hi=L${len - 1}`, `L = ${len} is infeasible: ${ribbons.map((r) => Math.floor(r / len)).join(' + ')} = ${count} pieces < ${k}. Lengths ≥ ${len} are all too few — discard them and set hi below ${len}.`, { mid: mid, count: count });
    }
  }

  emitDone('DONE', `L=${result ?? 0}`, result !== null
      ? `Largest feasible cut length is L = ${result}: it splits the ribbons into ≥ ${k} pieces while no longer cut can. Answer ${result}.`
      : `No length cuts ${k} pieces — answer 0.`, { mid: null, count: null }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RibState>) {
  const s = frame.state;
  const live = s.lo <= s.hi;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.result !== null && s.values[i] === s.result && !live) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const midLen = s.mid !== null ? s.values[s.mid] : null;
  const rail = (
    <>
      <RailGroup label="search">
        <RailStat k="lo" v={live ? s.values[s.lo] : '—'} tone="accent" />
        <RailStat k="hi" v={live ? s.values[s.hi] : '—'} tone="bad" />
        <RailStat k="mid" v={midLen ?? '—'} tone="warn" />
        <RailStat k="pieces" v={s.count ?? '—'} />
      </RailGroup>
      <RailResult label="best L" value={s.result ?? '…'} tone={s.done ? (s.result !== null ? 'good' : 'bad') : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} label={(i) => `L${i + 1}`} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RibState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const midLen = s.mid !== null ? s.values[s.mid] : null;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="lo (length)" v={s.lo <= s.hi ? s.values[s.lo] : '—'} />
      <InspectorRow k="hi (length)" v={s.lo <= s.hi ? s.values[s.hi] : '—'} />
      <InspectorRow k="mid (length)" v={midLen ?? '—'} />
      <InspectorRow k="pieces(mid)" v={s.count ?? '—'} />
      <InspectorRow k="best L" v={s.result ?? '…searching'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-47-maximum-length-of-ribbon-cut';
export const title = 'Maximum Length of Ribbon Cut';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rib1', label: 'ribbons [5,7,9], k=4', value: { ribbons: [5, 7, 9], k: 4 } },
    { id: 'rib2', label: 'ribbons [9,7,5], k=3', value: { ribbons: [9, 7, 5], k: 3 } },
  ] satisfies SampleInput<RibInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RibState | undefined;
    return s && s.result !== null ? { ok: true, label: `L = ${s.result}` } : { ok: false, label: '0' };
  },
};
