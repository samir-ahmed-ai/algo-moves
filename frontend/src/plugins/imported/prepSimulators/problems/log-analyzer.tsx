import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
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
  let level = fields[0].toUpperCase();
  if (level.endsWith(':')) level = level.slice(0, -1);
  return level;
}

function record({ lines }: LogInput): Frame<LogState>[] {
  let total = 0;
  const byLevel: Record<string, number> = {};

  const { emit, frames } = createRecorder<LogState>(() => ({
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
  const entries = Object.entries(s.byLevel).sort((a, b) => b[1] - a[1]);
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
    prompt: 'Which approach fits "Log analyzer"?',
    choices: [
      {
        label: 'Log parsing aggregation — fits this problem',
        correct: true,
      },
      {
        label: 'Two Heaps — different approach',
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
      {
        label: 'Bijective tiny URL encode/decode — different approach',
      },
    ],
    explain: 'Parse each line; bucket counts by log level',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Log analyzer), what strategy is established?',
    choices: [
      {
        label: 'Parse each line; bucket counts — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Log Analyzer: ingest each line, parse level from first token, increment counters. report() returns TOTAL + per-level counts.',
  },
  {
    id: 'key-step',
    prompt: 'On the "REPORT" step ( total), what happens?',
    choices: [
      {
        label: 'report(): TOTAL=, levels: — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain: 'report(): TOTAL=, levels: ${Object.entries(byLevel).map(([k, v]) => ',
  },
  {
    id: 'state',
    prompt: 'What does the `total` field track in the visualization state?',
    choices: [
      {
        label: 'Field total in state — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain:
      'The recorder snapshots `total` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Log analyzer"?',
    choices: [
      {
        label: 'O(lines) time, O(unique keys) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(total painted) time, O(max coordinate) — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(lines). O(unique keys). Fields; level=upper(first); ByLevel[level]++',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'report(): TOTAL=, levels: — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'report(): TOTAL=, levels: ${Object.entries(byLevel).map(([k, v]) => ',
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
