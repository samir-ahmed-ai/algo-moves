import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LogInput {
  lines: string[];
}

interface LogState {
  total: number;
  byLevel: Record<string, number>;
  lastLine: string;
  op: string;
  done: boolean;
}

function parseLevel(line: string): string | null {
  const fields = line.trim().split(/\s+/);
  if (fields.length === 0) return null;
  let level = fields[0].toUpperCase();
  if (level.endsWith(':')) level = level.slice(0, -1);
  return level;
}

function record({ lines }: LogInput): Frame<LogState>[] {
  const frames: Frame<LogState>[] = [];
  let total = 0;
  const byLevel: Record<string, number> = {};

  const emit = (type: string, note: string, caption: string, s: Partial<LogState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        total,
        byLevel: { ...byLevel },
        lastLine: '',
        op: '',
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${lines.length} lines`,
    `Log Analyzer: ingest each line, parse level from first token, increment counters. report() returns TOTAL + per-level counts.`,
    {},
  );

  for (const line of lines) {
    total++;
    const level = parseLevel(line);
    if (level) byLevel[level] = (byLevel[level] ?? 0) + 1;
    emit(
      'INGEST',
      level ?? 'unknown',
      `ingest("${line.slice(0, 40)}${line.length > 40 ? '…' : ''}"): level=${level ?? '—'}, total=${total}.`,
      { lastLine: line, op: line.slice(0, 30), byLevel: { ...byLevel }, total },
    );
  }

  emit(
    'REPORT',
    `${total} total`,
    `report(): TOTAL=${total}, levels: ${Object.entries(byLevel).map(([k, v]) => `${k}=${v}`).join(', ')}.`,
    { op: 'report', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LogState>) {
  const s = frame.state;
  const entries = Object.entries(s.byLevel).sort((a, b) => b[1] - a[1]);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.done && <span className="ml-2 font-mono text-good">total={s.total}</span>}
      </div>
      {s.lastLine && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink2')}>
          last: {s.lastLine.slice(0, 50)}
        </div>
      )}
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>by level</div>
      <div className="mt-1 space-y-1">
        <div className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
          TOTAL → {s.total}
        </div>
        {entries.map(([level, count]) => (
          <div key={level} className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
            {level} → {count}
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LogState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="total" v={s.total} />
      <InspectorRow k="levels" v={Object.keys(s.byLevel).length} />
      <InspectorRow k="done" v={s.done ? 'yes' : 'no'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-log-analyzer';
export const title = 'Log analyzer';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'log1',
      label: 'INFO/WARN/ERROR mix',
      value: {
        lines: ['INFO: started', 'WARN: slow query', 'ERROR: timeout', 'INFO: retry ok'],
      },
    },
  ] satisfies SampleInput<LogInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LogState | undefined;
    return s?.done ? { ok: true, label: `${s.total} lines` } : { ok: false, label: 'incomplete' };
  },
};
