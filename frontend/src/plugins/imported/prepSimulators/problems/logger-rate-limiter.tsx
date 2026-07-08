import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

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

function record({ ops }: LoggerInput): Frame<LoggerState>[] {
  const logs: Record<string, number> = {};

  const { emit, frames } = createPrepRecorder<LoggerState>(() => ({
    logs: { ...logs },
    op: '',
    allowed: null,
    lastMsg: '',
    done: false,
  }));

  emit(
    'INIT',
    'empty map',
    `Logger Rate Limiter: map message → last printed timestamp. ShouldPrintMessage(ts, msg) returns false if the same msg was printed within the last 10 seconds.`,
    {},
  );

  for (const { ts, msg } of ops) {
    const last = logs[msg]!;
    if (last !== undefined && ts < last + 10) {
      emit(
        'BLOCK',
        `block @${ts}`,
        `ts=${ts}, msg="${msg}": last printed at ${last}; ${ts} < ${last}+10 → return false (rate limited).`,
        { op: `@${ts} "${msg}"`, allowed: false, lastMsg: msg },
        'bad',
      );
    } else {
      logs[msg]! = ts;
      emit(
        'PRINT',
        `print @${ts}`,
        `ts=${ts}, msg="${msg}": ${last === undefined ? 'first time' : `last was ${last}, gap ≥ 10`} → print and store logs["${msg}"]!=${ts}.`,
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
  const entries = Object.entries(s.logs).sort((a, b) => a[1]! - b[1]!);
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.allowed !== null && (
        <RailGroup label="result">
          <RailStat k="ok" v={s.allowed ? 'print' : 'blocked'} tone={s.allowed ? 'good' : 'bad'} />
        </RailGroup>
      )}
      <RailGroup label="logs">
        <RailStat k="size" v={Object.keys(s.logs).length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
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
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does the logger rate limiter remember recent prints?',
    choices: [
      {
        label: 'Message-to-timestamp map — per-msg last printed time',
        correct: true,
      },
      {
        label: 'Level counter hash — aggregate INFO WARN ERROR totals',
      },
      {
        label: 'Sorted booking intervals — half-open overlap rejection',
      },
      {
        label: 'Index-value pair lists — merge-walk sparse vectors',
      },
    ],
    explain:
      'logs[msg] stores last allowed timestamp; ShouldPrintMessage compares ts against last+10.',
  },
  {
    id: 'key-step',
    prompt: 'When does ShouldPrintMessage return false (BLOCK frame)?',
    choices: [
      {
        label: 'Same msg within 10 sec — ts < lastPrinted + 10',
        correct: true,
      },
      {
        label: 'Any repeat message — second print always blocked',
      },
      {
        label: 'Timestamp decreases — reject non-monotonic ts only',
      },
      {
        label: 'Map size exceeds ten — cap distinct messages at ten',
      },
    ],
    explain:
      'BLOCK emits when last is defined and ts is still inside the ten-second window after last.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Logger Rate Limiter?',
    choices: [
      {
        label: 'O(1) per message, O(distinct msgs) space — hash map lookup',
        correct: true,
      },
      {
        label: 'O(n) per message, O(n) space — scan all prior timestamps',
      },
      {
        label: 'O(log n) per message, O(1) space — heap of recent events',
      },
      {
        label: 'O(messages) time, O(1) space — single last-global timestamp',
      },
    ],
    explain: 'Each op is one map get/set; storage scales with distinct messages ever printed.',
  },
  {
    id: 'edge',
    prompt: 'What happens on the first print of a new message?',
    choices: [
      {
        label: 'Always allowed — last undefined so window check is skipped',
        correct: true,
      },
      {
        label: 'Blocked until ten seconds — even first print waits',
      },
      {
        label: 'Requires empty map — reject if any other msg was printed',
      },
      {
        label: 'Print but do not store — map updated only on second print',
      },
    ],
    explain: 'When last === undefined the else branch prints and sets logs[msg] = ts.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
    return s?.done
      ? { ok: true, label: `${Object.keys(s.logs).length} msgs` }
      : { ok: false, label: 'incomplete' };
  },
};
