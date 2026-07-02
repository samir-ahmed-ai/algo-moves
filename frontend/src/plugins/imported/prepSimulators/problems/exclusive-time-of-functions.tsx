import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ExclInput {
  n: number;
  logs: string[];
}

interface ExclState {
  n: number;
  res: number[];
  stack: number[];
  prev: number;
  op: string;
  log: string;
  done: boolean;
}

function record({ n, logs }: ExclInput): Frame<ExclState>[] {  const res = new Array(n).fill(0);
  const stack: number[] = [];
  let prev = 0;

  const { emit, frames } = createRecorder<ExclState>(() => ({
        n,
        res: res.slice(),
        stack: stack.slice(),
        prev,
        op: '',
        log: '',
        done: false
      }));

  emit(
    'INIT',
    `${n} functions`,
    `Exclusive Time of Functions: stack tracks active function IDs. On start/end logs, credit elapsed time to stack top.`,
    {},
  );

  for (const log of logs) {
    const parts = log.split(':');
    const id = parseInt(parts[0], 10);
    const ts = parseInt(parts[2], 10);
    if (parts[1] === 'start') {
      if (stack.length > 0) {
        res[stack[stack.length - 1]] += ts - prev;
      }
      stack.push(id);
      prev = ts;
      emit(
        'START',
        `fn ${id} @${ts}`,
        `"${log}": pause current fn ${stack.length > 1 ? stack[stack.length - 2] : '—'}, push ${id}, prev=${ts}.`,
        { op: `start ${id}`, log, stack: stack.slice(), prev, res: res.slice() },
      );
    } else {
      res[stack[stack.length - 1]] += ts - prev + 1;
      stack.pop();
      prev = ts + 1;
      emit(
        'END',
        `fn ${id} @${ts}`,
        `"${log}": credit fn ${id} with ${ts - (prev - 1) + 1 - 1} tick(s), pop stack, prev=${prev}.`,
        { op: `end ${id}`, log, stack: stack.slice(), prev, res: res.slice() },
        'good',
      );
    }
  }

  emit(
    'DONE',
    res.join(', '),
    `Done. Exclusive times: [${res.join(', ')}].`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ExclState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.log || s.op || '—'}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        stack: [{s.stack.join(', ') || 'empty'}]
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {s.res.map((t, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              s.stack.includes(i) ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            f{i}:{t}
          </span>
        ))}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>prev = {s.prev}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ExclState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="log" v={s.log || '—'} />
      <InspectorRow k="stack" v={s.stack.length ? `[${s.stack.join(', ')}]` : 'empty'} />
      <InspectorRow k="prev" v={s.prev} />
      <InspectorRow k="res" v={`[${s.res.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-exclusive-time-of-functions';
export const title = 'Exclusive Time of Functions';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ex1',
      label: 'classic nested calls',
      value: {
        n: 2,
        logs: ['0:start:0', '1:start:2', '1:end:5', '0:end:6'],
      },
    },
  ] satisfies SampleInput<ExclInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ExclState | undefined;
    return s?.done ? { ok: true, label: `[${s.res.join(', ')}]` } : { ok: false, label: 'incomplete' };
  },
};
