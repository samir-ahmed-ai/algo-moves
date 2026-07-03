import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface CombInput {
  n: number;
  k: number;
}

interface CombState {
  n: number;
  k: number;
  cur: number[]; // chosen values (1..n)
  pick: number | null; // value currently under consideration
  results: number[][];
  done: boolean;
}

function record({ n, k }: CombInput): Frame<CombState>[] {  const cur: number[] = [];
  const results: number[][] = [];

  const { emit, frames } = createRecorder<CombState>(() => ({
        n: n,
        k: k,
        cur: cur.slice(),
        results: results.map((r) => r.slice()),
        pick: null,
        done: false
      }));

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit('INIT', `${n} choose ${k}`, `Generate every combination of ${k} numbers from 1..${n}. Backtrack: pick numbers in increasing order, recurse, then undo the last pick to explore the next branch. There are C(${n},${k}) combinations.`, { pick: null });

  const backtrack = (start: number) => {
    if (cur.length === k) {
      results.push(cur.slice());
      emit('RECORD', `+${fmt(cur)}`, `cur has ${k} numbers — record the combination ${fmt(cur)} (${results.length} so far).`, { pick: null }, 'good');
      return;
    }
    for (let v = start; v <= n; v++) {
      cur.push(v);
      emit('CHOOSE', `pick ${v}`, `Pick ${v} and recurse on values greater than ${v}. cur = ${fmt(cur)}.`, { pick: v });
      backtrack(v + 1);
      cur.pop();
      emit('BACKTRACK', `undo ${v}`, `Backtrack: remove ${v} so the next branch tries a different value. cur = ${fmt(cur)}.`, { pick: v });
    }
  };

  backtrack(1);
  emit('DONE', `${results.length} combos`, `All branches explored — ${results.length} combinations of ${k} from 1..${n}.`, { pick: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CombState>) {
  const s = frame.state;
  const values = Array.from({ length: s.n }, (_, i) => i + 1);
  const inCur = new Set(s.cur);
  const pointers: ArrayPointer[] = [];
  if (s.pick !== null) pointers.push({ i: s.pick - 1, label: 'pick', tone: 'warn', place: 'above' });
  const tone = (i: number) => {
    if (s.pick === i + 1) return 'mid';
    if (inCur.has(i + 1)) return 'match';
    return '';
  };
  const choose = (a: number, b: number) => {
    let r = 1;
    for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1);
    return Math.round(r);
  };
  return (
    <VizStage rail={<>
      <RailGroup label="path">
        <RailStat k="cur" v={s.cur.length ? `[${s.cur.join(', ')}]` : '[]'} tone="accent" />
        <RailStat k="pick" v={s.pick ?? '—'} />
      </RailGroup>
      <RailStack label="results" items={s.results.map((r) => `[${r.join(', ')}]`)} />
      {s.done && <RailResult label="total" value={`${s.results.length} / ${choose(s.n, s.k)}`} tone="good" />}
    </>}>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CombState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const choose = (a: number, b: number) => {
    let r = 1;
    for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1);
    return Math.round(r);
  };
  return (
    <VarGrid>
      <InspectorRow k="n / k" v={`${s.n} / ${s.k}`} />
      <InspectorRow k="current" v={`[${s.cur.join(', ')}]`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target C(n,k)" v={choose(s.n, s.k)} />
    </VarGrid>
  );
}

export const manifestId = 'imp-27-combinations';
export const title = 'Combinations';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '4c2', label: 'n=4, k=2', value: { n: 4, k: 2 } },
    { id: '5c3', label: 'n=5, k=3', value: { n: 5, k: 3 } },
  ] satisfies SampleInput<CombInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CombState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} combos` };
  },
};
