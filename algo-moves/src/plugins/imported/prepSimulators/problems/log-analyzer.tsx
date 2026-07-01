import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

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

function record({ lines }: LogInput): Frame<LogState>[] {  let total = 0;
  const byLevel: Record<string, number> = {};

  const { emit, frames } = createRecorder<LogState>(() => ({
        total,
        byLevel: { ...byLevel },
        lastLine: '',
        op: '',
        done: false
      }));

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
  const levelItems = entries.map(([level, count]) => `${level} → ${count}`);
  return (
    <VizStage rail={<>
      <RailStack label="by level" items={levelItems} />
      <RailGroup label="progress">
        <RailStat k="total" v={s.total} tone="accent" />
        <RailStat k="levels" v={Object.keys(s.byLevel).length} />
      </RailGroup>
      {s.done && <RailResult label="total" value={s.total} tone="good" />}
    </>}>
      <div className="font-mono text-sm text-ink2 break-all">
        {s.op || '—'}
      </div>
    </VizStage>
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
