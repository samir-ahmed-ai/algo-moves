import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

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
  let level = fields[0]!.toUpperCase();
  if (level.endsWith(':')) level = level.slice(0, -1);
  return level;
}

function record({ lines }: LogInput): Frame<LogState>[] {
  let total = 0;
  const byLevel: Record<string, number> = {};

  const { emit, frames } = createPrepRecorder<LogState>(() => ({
    total,
    byLevel: { ...byLevel },
    lastLine: '',
    op: '',
    done: false,
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
    if (level) byLevel[level]! = (byLevel[level]! ?? 0) + 1;
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
    `report(): TOTAL=${total}, levels: ${Object.entries(byLevel)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}.`,
    { op: 'report', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LogState>) {
  const s = frame.state;
  const entries = Object.entries(s.byLevel).sort((a, b) => b[1]! - a[1]!);
  const levelItems = entries.map(([level, count]) => `${level} → ${count}`);
  return (
    <VizStage
      rail={
        <>
          <RailStack label="by level" items={levelItems} />
          <RailGroup label="progress">
            <RailStat k="total" v={s.total} tone="accent" />
            <RailStat k="levels" v={Object.keys(s.byLevel).length} />
          </RailGroup>
          {s.done && <RailResult label="total" value={s.total} tone="good" />}
        </>
      }
    >
      <div className="font-mono text-sm text-ink2 break-all">{s.op || '—'}</div>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does the log analyzer aggregate lines?',
    choices: [
      {
        label: 'Level hash counters — first token parsed as log level',
        correct: true,
      },
      {
        label: 'Message timestamp map — ten-second dedupe window',
      },
      {
        label: 'Copy-on-write snapshots — versioned map per ingest',
      },
      {
        label: 'RLE pair iterator — consume count-value encoding',
      },
    ],
    explain:
      'parseLevel uppercases the first field; byLevel[level] increments while total counts all lines.',
  },
  {
    id: 'key-step',
    prompt: 'On INGEST, what is updated for each line?',
    choices: [
      {
        label: 'Increment total — bump level bucket when parse succeeds',
        correct: true,
      },
      {
        label: 'Replace byLevel entirely — rebuild counters from scratch',
      },
      {
        label: 'Append line to stack — defer counting until report',
      },
      {
        label: 'Binary search levels — insert into sorted level array',
      },
    ],
    explain:
      'total always increases; if parseLevel returns a level string, that bucket count increases too.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for the log analyzer?',
    choices: [
      {
        label: 'O(lines) ingest, O(unique levels) space — one pass hash',
        correct: true,
      },
      {
        label: 'O(lines log lines) time, O(lines) space — sort each ingest',
      },
      {
        label: 'O(1) per line, O(1) space — fixed three level slots only',
      },
      {
        label: 'O(levels²) time, O(1) space — pairwise level comparisons',
      },
    ],
    explain: 'Each line is parsed once; storage is proportional to distinct level keys seen.',
  },
  {
    id: 'edge',
    prompt: 'What does report() summarize at the end?',
    choices: [
      {
        label: 'TOTAL line count plus per-level counts — aggregated buckets',
        correct: true,
      },
      {
        label: 'Last ingested line report — discard prior level statistics',
      },
      {
        label: 'Longest line length — ignore level token parsing entirely',
      },
      {
        label: 'Sorted raw lines — return full text not numeric counts',
      },
    ],
    explain: 'The REPORT frame caption lists TOTAL and each level=v from the byLevel hash.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
