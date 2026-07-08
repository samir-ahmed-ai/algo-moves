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

function record({ n, logs }: ExclInput): Frame<ExclState>[] {
  const res = new Array(n).fill(0);
  const stack: number[] = [];
  let prev = 0;

  const { emit, frames } = createPrepRecorder<ExclState>(() => ({
    n,
    res: res.slice(),
    stack: stack.slice(),
    prev,
    op: '',
    log: '',
    done: false,
  }));

  emit(
    'INIT',
    `${n} functions`,
    `Exclusive Time of Functions: stack tracks active function IDs. On start/end logs, credit elapsed time to stack top.`,
    {},
  );

  for (const log of logs) {
    const parts = log.split(':');
    const id = parseInt(parts[0]!, 10);
    const ts = parseInt(parts[2]!, 10);
    if (parts[1]! === 'start') {
      if (stack.length > 0) {
        res[stack[stack.length - 1]!] += ts - prev;
      }
      stack.push(id);
      prev = ts;
      emit(
        'START',
        `fn ${id} @${ts}`,
        `"${log}": pause current fn ${stack.length > 1 ? stack[stack.length - 2]! : '—'}, push ${id}, prev=${ts}.`,
        { op: `start ${id}`, log, stack: stack.slice(), prev, res: res.slice() },
      );
    } else {
      res[stack[stack.length - 1]!] += ts - prev + 1;
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
  const rail = (
    <>
      <RailGroup label="log">
        <RailStat k="cmd" v={s.log || s.op || '—'} tone="accent" />
      </RailGroup>
      <RailGroup label="stack">
        <RailStat k="top" v={s.stack.length ? s.stack[s.stack.length - 1]! : '—'} />
        <RailStat k="depth" v={s.stack.length} />
      </RailGroup>
      <RailGroup label="time">
        <RailStat k="prev" v={s.prev} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-2">
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
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structure tracks exclusive function time from logs?',
    choices: [
      {
        label: 'Call stack plus prev timestamp — credit elapsed to stack top',
        correct: true,
      },
      {
        label: 'Dual heaps median — split numeric stream into halves',
      },
      {
        label: 'Sorted avail rooms — busy heap for meeting assignment',
      },
      {
        label: 'Jump array paint — skip already colored line cells',
      },
    ],
    explain:
      'start/end logs adjust res[stackTop] using ts - prev; stack pushes and pops active function ids.',
  },
  {
    id: 'key-step',
    prompt: 'On a start log, what happens before pushing the new function id?',
    choices: [
      {
        label: 'Pause current fn — add ts minus prev to previous stack top',
        correct: true,
      },
      {
        label: 'Clear stack entirely — reset all active functions first',
      },
      {
        label: 'Credit new fn immediately — add full ts to incoming id',
      },
      {
        label: 'Pop until empty — unwind stack on every start event',
      },
    ],
    explain: 'If stack nonempty, res[stackTop] += ts - prev before push(id) and prev = ts.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Exclusive Time of Functions?',
    choices: [
      {
        label: 'O(logs) time, O(n) space — one stack pass over log lines',
        correct: true,
      },
      {
        label: 'O(n²) time, O(1) space — pairwise compare all log pairs',
      },
      {
        label: 'O(log n) per log, O(log n) space — heap of timestamps',
      },
      {
        label: 'O(1) time, O(logs) space — store logs without processing',
      },
    ],
    explain: 'Each log line does O(1) stack work; res array size is number of functions n.',
  },
  {
    id: 'edge',
    prompt: 'After an end log, why is prev set to ts + 1?',
    choices: [
      {
        label: 'Exclude end tick double-count — next interval starts after inclusive end',
        correct: true,
      },
      {
        label: 'Reset timeline to zero — restart measurement from origin',
      },
      {
        label: 'Mark function idle — prev unused until next start log',
      },
      {
        label: 'Align to even timestamps — force parity on prev tracker',
      },
    ],
    explain:
      'End credits inclusive ts - prev + 1, then prev becomes ts+1 so nested calls do not overlap ticks.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
    return s?.done
      ? { ok: true, label: `[${s.res.join(', ')}]` }
      : { ok: false, label: 'incomplete' };
  },
};
