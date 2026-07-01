import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ n, k }: CombInput): Frame<CombState>[] {
  const frames: Frame<CombState>[] = [];
  const cur: number[] = [];
  const results: number[][] = [];

  const emit = (type: string, note: string, caption: string, pick: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, k, cur: cur.slice(), pick, results: results.map((r) => r.slice()), done: type === 'DONE' },
    });

  const fmt = (xs: number[]) => `[${xs.join(', ')}]`;

  emit(
    'INIT',
    `${n} choose ${k}`,
    `Generate every combination of ${k} numbers from 1..${n}. Backtrack: pick numbers in increasing order, recurse, then undo the last pick to explore the next branch. There are C(${n},${k}) combinations.`,
    null,
  );

  const backtrack = (start: number) => {
    if (cur.length === k) {
      results.push(cur.slice());
      emit('RECORD', `+${fmt(cur)}`, `cur has ${k} numbers — record the combination ${fmt(cur)} (${results.length} so far).`, null, 'good');
      return;
    }
    for (let v = start; v <= n; v++) {
      cur.push(v);
      emit('CHOOSE', `pick ${v}`, `Pick ${v} and recurse on values greater than ${v}. cur = ${fmt(cur)}.`, v);
      backtrack(v + 1);
      cur.pop();
      emit('BACKTRACK', `undo ${v}`, `Backtrack: remove ${v} so the next branch tries a different value. cur = ${fmt(cur)}.`, v);
    }
  };

  backtrack(1);
  emit('DONE', `${results.length} combos`, `All branches explored — ${results.length} combinations of ${k} from 1..${n}.`, null, 'good');
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        choose {s.k} of 1..{s.n} · current = <span className="font-mono text-ink">[{s.cur.join(', ')}]</span>
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        combinations found ({s.results.length})
        <div className="mt-1 flex flex-col gap-0.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('font-mono text-ink', vizText.sm)}>
              [{r.join(', ')}]
            </span>
          ))}
        </div>
      </div>
    </div>
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

export const simulator: DpSimulator = {
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
