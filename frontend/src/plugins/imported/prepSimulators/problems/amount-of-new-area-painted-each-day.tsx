import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PaintInput {
  paint: [number, number][];
}

interface PaintState {
  maxR: number;
  jump: number[];
  results: number[];
  day: number;
  newCount: number;
  op: string;
  done: boolean;
}

function record({ paint }: PaintInput): Frame<PaintState>[] {  let maxR = 0;
  for (const [, r] of paint) if (r > maxR) maxR = r;
  const jump = new Array(maxR + 1).fill(0);
  const results: number[] = [];

  const { emit, frames } = createRecorder<PaintState>(() => ({
        maxR,
        jump: jump.slice(),
        results: results.slice(),
        day: 0,
        newCount: 0,
        op: '',
        done: false
      }));

  emit(
    'INIT',
    `${paint.length} days`,
    `Amount of New Area Painted Each Day: jump[] skips already-painted segments. For each [l,r), walk with jump pointers — count only cells where jump[i]==0 (fresh paint).`,
    {},
  );

  for (let day = 0; day < paint.length; day++) {
    const [l, r] = paint[day];
    let cnt = 0;
    let i = l;
    while (i < r) {
      if (jump[i] === 0) {
        jump[i] = i + 1;
        cnt++;
        i++;
      } else {
        const next = jump[i];
        jump[i] = r;
        i = next;
      }
    }
    results.push(cnt);
    emit(
      'PAINT',
      `day ${day + 1}: [${l},${r}) → ${cnt}`,
      `Day ${day + 1}: paint [${l}, ${r}). Jump-pointer walk finds ${cnt} newly painted cell(s). Overlaps skip via jump[i]=r.`,
      { day: day + 1, newCount: cnt, op: `[${l},${r}) → ${cnt}` },
      'good',
    );
  }

  emit(
    'DONE',
    results.join(', '),
    `Done. New area per day: [${results.join(', ')}].`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PaintState>) {
  const s = frame.state;
  const painted = s.jump.filter((v, i) => v > i).length;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.day > 0 && (
          <span className="ml-2 font-mono text-good">
            day {s.day}: +{s.newCount}
          </span>
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        line [0..{s.maxR}) · {painted} painted cells
      </div>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {Array.from({ length: Math.min(s.maxR, 40) }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-4 w-3 rounded-sm border',
              vizText.sm,
              s.jump[i] > i ? 'border-accent bg-accentbg' : 'border-edge bg-surface2',
            )}
            title={`${i}`}
          />
        ))}
        {s.maxR > 40 && <span className={cn(vizText.sm, 'text-ink3')}>…</span>}
      </div>
      {s.results.length > 0 && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>
          results: [{s.results.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PaintState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="day" v={s.day || '—'} />
      <InspectorRow k="new area" v={s.newCount || '—'} />
      <InspectorRow k="results" v={s.results.length ? `[${s.results.join(', ')}]` : '—'} />
      <InspectorRow k="maxR" v={s.maxR} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-amount-of-new-area-painted-each-day';
export const title = 'Amount of New Area Painted Each Day';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'paint1',
      label: '[[1,4],[2,5]]',
      value: { paint: [[1, 4], [2, 5]] },
    },
    {
      id: 'paint2',
      label: '[[1,4],[4,7]]',
      value: { paint: [[1, 4], [4, 7]] },
    },
  ] satisfies SampleInput<PaintInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PaintState | undefined;
    return s?.done ? { ok: true, label: `[${s.results.join(', ')}]` } : { ok: false, label: 'incomplete' };
  },
};
