import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type SqOp = { kind: 'add'; point: [number, number] } | { kind: 'count'; point: [number, number] };

interface SqInput {
  ops: SqOp[];
}

interface SqState {
  points: [number, number][];
  counts: Record<string, number>;
  op: string;
  result: number | null;
  done: boolean;
}

const key = (p: [number, number]) => `${p[0]},${p[1]}`;

function record({ ops }: SqInput): Frame<SqState>[] {  const counts: Record<string, number> = {};
  const pts: [number, number][] = [];

  const { emit, frames } = createRecorder<SqState>(() => ({
        points: pts.map((p) => [...p] as [number, number]),
        counts: { ...counts },
        op: '',
        result: null,
        done: false
      }));

  emit(
    'INIT',
    'empty',
    `Detect Squares: store point counts. Count(q) sums cnt[p1]×cnt[p2] for diagonal pairs forming axis-aligned squares with q.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'add') {
      const p = o.point;
      const k = key(p);
      counts[k] = (counts[k] ?? 0) + 1;
      pts.push(p);
      emit(
        'ADD',
        key(p),
        `Add(${p[0]},${p[1]}): count at point → ${counts[k]}. Total stored points: ${pts.length}.`,
        { op: `add (${p[0]},${p[1]})` },
      );
    } else {
      const [qx, qy] = o.point;
      let res = 0;
      for (const p of pts) {
        const [px, py] = p;
        if (px === qx || Math.abs(px - qx) !== Math.abs(py - qy)) continue;
        res += (counts[key([px, qy])] ?? 0) * (counts[key([qx, py])] ?? 0);
      }
      emit(
        'COUNT',
        `(${qx},${qy}) → ${res}`,
        `Count(${qx},${qy}): scan diagonal partners p where |px-qx|=|py-qy| and px≠qx. Sum cnt[px,qy]×cnt[qx,py] = ${res}.`,
        { op: `count (${qx},${qy})`, result: res },
        'good',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SqState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">→ {s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>{s.points.length} point(s)</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {Object.entries(s.counts).map(([k, c]) => (
          <span key={k} className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
            ({k})×{c}
          </span>
        ))}
        {Object.keys(s.counts).length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SqState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="points" v={s.points.length} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-detect-squares';
export const title = 'Detect Squares';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sq1',
      label: 'square from 4 corners',
      value: {
        ops: [
          { kind: 'add', point: [0, 0] },
          { kind: 'add', point: [0, 1] },
          { kind: 'add', point: [1, 0] },
          { kind: 'count', point: [1, 1] },
        ],
      },
    },
  ] satisfies SampleInput<SqInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};
