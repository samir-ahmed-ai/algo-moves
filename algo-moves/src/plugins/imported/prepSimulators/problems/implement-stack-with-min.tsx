import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { QueueTape } from '../../../../components/QueueTape';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type OpKind = 'push' | 'pop' | 'min';

interface MinStackOp {
  kind: OpKind;
  /** Only present for push ops. */
  val?: number;
}

interface MinStackInput {
  ops: MinStackOp[];
}

interface MinStackState {
  /** Values bottom -> top (top is last). */
  vals: number[];
  /** Parallel running-min stack, mins[i] = min of vals[0..i]. */
  mins: number[];
  /** Index of the cell touched this frame (top), or null. */
  active: number | null;
  /** Last op as a label, e.g. "push 3" / "pop" / "min". */
  op: string;
  /** Value returned by the op this frame (pop/min), or null. */
  out: number | null;
  done: boolean;
}

function record({ ops }: MinStackInput): Frame<MinStackState>[] {  const vals: number[] = [];
  const mins: number[] = [];

  const { emit, frames } = createRecorder<MinStackState>(() => ({
        vals: vals.slice(),
        mins: mins.slice(),
        active: null,
        op: '',
        out: null,
        done: false
      }));

  emit(
    'INIT',
    'empty stack',
    `MinStack keeps a second stack of running minimums alongside the values. Every cell stores both its value and the smallest value at or below it, so push, pop, and Min are all O(1).`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'push') {
      const val = o.val ?? 0;
      // m := val; if top exists and top.min < m, m = top.min
      const topMin = mins.length > 0 ? mins[mins.length - 1] : null;
      const m = topMin !== null && topMin < val ? topMin : val;
      vals.push(val);
      mins.push(m);
      const reason =
        topMin === null
          ? `the stack was empty, so its running-min is just ${val}`
          : topMin < val
            ? `min(${val}, previous-min ${topMin}) = ${topMin}`
            : `min(${val}, previous-min ${topMin}) = ${val}`;
      emit(
        'PUSH',
        `push ${val}`,
        `Push ${val}. The new cell stores value ${val} and running-min = ${m}, because ${reason}. Min() can now read this top cell in O(1).`,
        { active: vals.length - 1, op: `push ${val}` },
      );
    } else if (o.kind === 'pop') {
      if (vals.length === 0) {
        emit(
          'POP',
          'pop empty',
          `Pop on an empty stack returns 0 (the Go solution's sentinel) and leaves the stack unchanged.`,
          { op: 'pop', out: 0 },
          'bad',
        );
        continue;
      }
      const v = vals[vals.length - 1];
      // show the cell about to leave, highlighted
      emit(
        'POP',
        `pop ${v}`,
        `Pop removes the top cell (value ${v}). Its paired running-min leaves with it, so the cell below automatically becomes the new top and the new Min reference.`,
        { active: vals.length - 1, op: 'pop', out: v },
      );
      vals.pop();
      mins.pop();
      emit(
        'POP',
        `popped ${v}`,
        `Returned ${v}. The stack is back to ${vals.length} cell(s); the running-min of the new top is already correct, no recomputation needed.`,
        { active: vals.length > 0 ? vals.length - 1 : null, op: 'pop', out: v },
        'good',
      );
    } else {
      // min
      if (vals.length === 0) {
        emit(
          'MIN',
          'min empty',
          `Min() on an empty stack returns 0 (sentinel). There is nothing to compare.`,
          { op: 'min', out: 0 },
          'bad',
        );
        continue;
      }
      const m = mins[mins.length - 1];
      emit(
        'MIN',
        `min ${m}`,
        `Min() just reads the running-min stored in the top cell: ${m}. No scan of the whole stack is needed — that is why it is O(1).`,
        { active: vals.length - 1, op: 'min', out: m },
        'good',
      );
    }
  }

  const finalMin = mins.length > 0 ? mins[mins.length - 1] : null;
  emit(
    'DONE',
    finalMin !== null ? `min ${finalMin}` : 'empty',
    finalMin !== null
      ? `All operations done. The stack holds ${vals.length} cell(s); the current minimum (top running-min) is ${finalMin}.`
      : `All operations done. The stack is empty.`,
    { active: vals.length > 0 ? vals.length - 1 : null, op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MinStackState>) {
  const s = frame.state;
  // QueueTape shows values bottom -> top (front label clarifies "top →").
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        op = <span className="font-mono text-ink">{s.op || '—'}</span>
        {s.out !== null && (
          <>
            {' · '}returned{' '}
            <span className="font-mono text-ink">{s.out}</span>
          </>
        )}
      </div>
      <QueueTape items={s.vals} label="stack · top →" />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        min&nbsp;
        {s.mins.length === 0 ? (
          <span className="text-ink3">empty</span>
        ) : (
          s.mins.map((m, i) => (
            <span
              key={i}
              className={cn(
                'mr-1 inline-block rounded px-1',
                i === s.active ? 'bg-accentbg text-accent' : 'text-ink',
              )}
            >
              {m}
            </span>
          ))
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        top cell:{' '}
        <span className="font-mono text-ink">
          {s.vals.length > 0
            ? `val=${s.vals[s.vals.length - 1]}, min=${s.mins[s.mins.length - 1]}`
            : '—'}
        </span>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinStackState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const topVal = s.vals.length > 0 ? s.vals[s.vals.length - 1] : '—';
  const topMin = s.mins.length > 0 ? s.mins[s.mins.length - 1] : '—';
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="size" v={s.vals.length} />
      <InspectorRow k="top.val" v={topVal} />
      <InspectorRow k="top.min (Min)" v={topMin} />
      <InspectorRow k="returned" v={s.out ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-implement-stack-with-min';
export const title = 'Implement stack with min';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ms1',
      label: 'push 5,3,7,2 · min · pop · min',
      value: {
        ops: [
          { kind: 'push', val: 5 },
          { kind: 'push', val: 3 },
          { kind: 'push', val: 7 },
          { kind: 'push', val: 2 },
          { kind: 'min' },
          { kind: 'pop' },
          { kind: 'min' },
        ],
      },
    },
    {
      id: 'ms2',
      label: 'push 4,1,1 · min · pop · pop · min',
      value: {
        ops: [
          { kind: 'push', val: 4 },
          { kind: 'push', val: 1 },
          { kind: 'push', val: 1 },
          { kind: 'min' },
          { kind: 'pop' },
          { kind: 'pop' },
          { kind: 'min' },
        ],
      },
    },
  ] satisfies SampleInput<MinStackInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinStackState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const finalMin = s.mins.length > 0 ? s.mins[s.mins.length - 1] : null;
    return finalMin !== null
      ? { ok: true, label: `min = ${finalMin}` }
      : { ok: true, label: 'empty' };
  },
};
