import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface IntersectInput {
  a: number[];
  b: number[];
}

interface IntersectState {
  a: number[];
  b: number[];
  i: number | null; // pointer into a
  j: number | null; // pointer into b
  out: number[]; // intersection collected so far
  takenA: number | null; // index in a just taken (matched)
  takenB: number | null; // index in b just taken (matched)
  done: boolean;
}

function record({ a, b }: IntersectInput): Frame<IntersectState>[] {
  const frames: Frame<IntersectState>[] = [];
  const out: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    j: number | null,
    takenA: number | null,
    takenB: number | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        a,
        b,
        i,
        j,
        out: out.slice(),
        takenA,
        takenB,
        done,
      },
    });

  emit(
    'INIT',
    `|a|=${a.length}, |b|=${b.length}`,
    `Find the intersection of two sorted arrays. Keep one pointer in each array; because both are sorted we never need to look back, so this runs in O(n+m) time and O(1) extra space.`,
    0,
    0,
    null,
    null,
    false,
  );

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      emit(
        'MATCH',
        `a[${i}]=b[${j}]=${a[i]}`,
        `a[${i}] = b[${j}] = ${a[i]} — equal values, so this element is in both arrays. Append ${a[i]} to the result and advance BOTH pointers.`,
        i,
        j,
        i,
        j,
        false,
        'good',
      );
      out.push(a[i]);
      i++;
      j++;
    } else if (a[i] < b[j]) {
      emit(
        'ADV_A',
        `a[${i}]=${a[i]} < b[${j}]=${b[j]}`,
        `a[${i}] = ${a[i]} is smaller than b[${j}] = ${b[j]}. The smaller value can never match anything further along in b, so advance i past it.`,
        i,
        j,
        null,
        null,
        false,
      );
      i++;
    } else {
      emit(
        'ADV_B',
        `a[${i}]=${a[i]} > b[${j}]=${b[j]}`,
        `b[${j}] = ${b[j]} is smaller than a[${i}] = ${a[i]}. The smaller value can never match anything further along in a, so advance j past it.`,
        i,
        j,
        null,
        null,
        false,
      );
      j++;
    }
  }

  emit(
    'DONE',
    out.length ? `∩ = [${out.join(',')}]` : '∩ = []',
    `One pointer reached the end of its array, so no more matches are possible. The intersection is [${out.join(', ')}].`,
    i < a.length ? i : null,
    j < b.length ? j : null,
    null,
    null,
    true,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<IntersectState>) {
  const s = frame.state;

  const ptrsA: ArrayPointer[] = [];
  if (s.i !== null && s.i < s.a.length) ptrsA.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const ptrsB: ArrayPointer[] = [];
  if (s.j !== null && s.j < s.b.length) ptrsB.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });

  const inOut = (vals: number[], idx: number, upto: number) =>
    s.out.includes(vals[idx]) && idx <= upto;

  const toneA = (idx: number) => {
    if (s.takenA === idx) return 'found';
    if (s.i === idx && !s.done) return 'match';
    if (inOut(s.a, idx, s.i ?? s.a.length)) return 'in-window';
    return '';
  };
  const toneB = (idx: number) => {
    if (s.takenB === idx) return 'found';
    if (s.j === idx && !s.done) return 'match';
    if (inOut(s.b, idx, s.j ?? s.b.length)) return 'in-window';
    return '';
  };

  const av = s.i !== null && s.i < s.a.length ? s.a[s.i] : '—';
  const bv = s.j !== null && s.j < s.b.length ? s.b[s.j] : '—';

  const rail = (
    <>
      <RailStack label="∩ collected" items={s.out.map(String)} />
      <RailGroup label="scan">
        <RailStat k="i" v={s.i ?? '—'} tone="accent" />
        <RailStat k="j" v={s.j ?? '—'} tone="warn" />
        <RailStat k="a[i]" v={av} />
        <RailStat k="b[j]" v={bv} />
      </RailGroup>
      {s.done && (
        <RailResult label="answer" value={`[${s.out.join(', ')}]`} tone={s.out.length > 0 ? 'good' : 'bad'} />
      )}
    </>
  );

  return (
    <VizStage rail={rail}>
      <div className="font-mono text-xs text-ink3">a</div>
      <ArrayRow values={s.a} cellTone={toneA} pointers={ptrsA} windowRange={null} />
      <div className="font-mono text-xs text-ink3 mt-2">b</div>
      <ArrayRow values={s.b} cellTone={toneB} pointers={ptrsB} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<IntersectState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const av = s.i !== null && s.i < s.a.length ? s.a[s.i] : '—';
  const bv = s.j !== null && s.j < s.b.length ? s.b[s.j] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="a[i]" v={av} />
      <InspectorRow k="b[j]" v={bv} />
      <InspectorRow k="intersection" v={`[${s.out.join(', ')}]`} />
      <InspectorRow k="|∩|" v={s.out.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-find-intersection-of-two-sorted';
export const title = 'Find intersection of two sorted';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fi1', label: '[1,2,4,5,6] ∩ [2,3,5,7]', value: { a: [1, 2, 4, 5, 6], b: [2, 3, 5, 7] } },
    { id: 'fi2', label: '[1,3,5,7] ∩ [2,4,6,8]', value: { a: [1, 3, 5, 7], b: [2, 4, 6, 8] } },
  ] satisfies SampleInput<IntersectInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IntersectState | undefined;
    const out = s?.out ?? [];
    return { ok: out.length > 0, label: `[${out.join(', ')}]` };
  },
};
