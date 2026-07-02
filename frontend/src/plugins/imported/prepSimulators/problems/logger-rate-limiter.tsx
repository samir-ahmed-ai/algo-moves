import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LogOp {
  ts: number;
  msg: string;
}

interface LoggerInput {
  ops: LogOp[];
}

interface LoggerState {
  logs: Record<string, number>;
  op: string;
  allowed: boolean | null;
  lastMsg: string;
  done: boolean;
}

function record({ ops }: LoggerInput): Frame<LoggerState>[] {  const logs: Record<string, number> = {};

  const { emit, frames } = createRecorder<LoggerState>(() => ({
        logs: { ...logs },
        op: '',
        allowed: null,
        lastMsg: '',
        done: false
      }));

  emit(
    'INIT',
    'empty map',
    `Logger Rate Limiter: map message → last printed timestamp. ShouldPrintMessage(ts, msg) returns false if the same msg was printed within the last 10 seconds.`,
    {},
  );

  for (const { ts, msg } of ops) {
    const last = logs[msg];
    if (last !== undefined && ts < last + 10) {
      emit(
        'BLOCK',
        `block @${ts}`,
        `ts=${ts}, msg="${msg}": last printed at ${last}; ${ts} < ${last}+10 → return false (rate limited).`,
        { op: `@${ts} "${msg}"`, allowed: false, lastMsg: msg },
        'bad',
      );
    } else {
      logs[msg] = ts;
      emit(
        'PRINT',
        `print @${ts}`,
        `ts=${ts}, msg="${msg}": ${last === undefined ? 'first time' : `last was ${last}, gap ≥ 10`} → print and store logs["${msg}"]=${ts}.`,
        { op: `@${ts} "${msg}"`, allowed: true, lastMsg: msg },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `${Object.keys(logs).length} msgs`,
    `Done. ${Object.keys(logs).length} distinct message(s) recorded in the map.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LoggerState>) {
  const s = frame.state;
  const entries = Object.entries(s.logs).sort((a, b) => a[1] - b[1]);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.allowed !== null && (
          <span className={cn('ml-2 font-mono', s.allowed ? 'text-good' : 'text-bad')}>
            → {s.allowed ? 'print' : 'blocked'}
          </span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>logs (msg → last ts)</div>
      <div className="mt-1 space-y-1">
        {entries.length === 0 ? (
          <span className={cn(vizText.sm, 'text-ink3')}>empty</span>
        ) : (
          entries.map(([msg, ts]) => (
            <div
              key={msg}
              className={cn(
                'rounded border px-2 py-0.5 font-mono',
                vizText.sm,
                msg === s.lastMsg ? 'border-accent bg-accentbg' : 'border-edge text-ink2',
              )}
            >
              &quot;{msg}&quot; → {ts}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LoggerState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="allowed" v={s.allowed === null ? '—' : s.allowed ? 'yes' : 'no'} />
      <InspectorRow k="window" v="10 sec" />
      <InspectorRow k="map size" v={Object.keys(s.logs).length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-logger-rate-limiter';
export const title = 'Logger Rate Limiter';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'log1',
      label: 'foo @1,8,9 · bar @5',
      value: {
        ops: [
          { ts: 1, msg: 'foo' },
          { ts: 8, msg: 'foo' },
          { ts: 9, msg: 'foo' },
          { ts: 5, msg: 'bar' },
        ],
      },
    },
  ] satisfies SampleInput<LoggerInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LoggerState | undefined;
    return s?.done ? { ok: true, label: `${Object.keys(s.logs).length} msgs` } : { ok: false, label: 'incomplete' };
  },
};
