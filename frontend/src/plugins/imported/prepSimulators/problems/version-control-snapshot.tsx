import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type VcOp =
  { kind: 'set'; key: string; value: number } | { kind: 'get'; key: string; version: number };

interface VcInput {
  ops: VcOp[];
}

interface VcState {
  history: Record<string, number>[];
  version: number;
  op: string;
  result: number | null;
  found: boolean | null;
  done: boolean;
}

function record({ ops }: VcInput): Frame<VcState>[] {
  const history: Record<string, number>[] = [{}];

  const { emit, frames } = createRecorder<VcState>(() => ({
    history: history.map((h) => ({ ...h })),
    version: history.length - 1,
    op: '',
    result: null,
    found: null,
    done: false,
  }));

  emit(
    'INIT',
    'v0',
    `Version Control Snapshot: each set() copies previous map and appends new version. get(key, version) reads history[version].`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'set') {
      const cur = history[history.length - 1];
      const next: Record<string, number> = { ...cur, [o.key]: o.value };
      history.push(next);
      emit(
        'SET',
        `${o.key}=${o.value}`,
        `set("${o.key}", ${o.value}): copy-on-write → version ${history.length - 1}.`,
        {
          op: `set ${o.key}=${o.value}`,
          version: history.length - 1,
          history: history.map((h) => ({ ...h })),
        },
      );
    } else {
      const ok = o.version >= 0 && o.version < history.length;
      const val = ok ? history[o.version][o.key] : undefined;
      const found = val !== undefined;
      emit(
        found ? 'GET' : 'MISS',
        ok ? String(val ?? '—') : 'bad ver',
        `get("${o.key}", v${o.version}): ${found ? `return ${val}` : ok ? 'key missing' : 'invalid version'}.`,
        {
          op: `get ${o.key}@v${o.version}`,
          result: found ? val! : null,
          found,
          version: history.length - 1,
          history: history.map((h) => ({ ...h })),
        },
        found ? 'good' : 'bad',
      );
    }
  }

  emit(
    'DONE',
    `v${history.length - 1}`,
    `Done. Current version = ${history.length - 1}.`,
    { op: 'done', done: true, version: history.length - 1 },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<VcState>) {
  const s = frame.state;
  const ver = s.version;
  const cur = s.history[ver] ?? {};
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.found && s.result !== null && (
          <span className="ml-2 font-mono text-good">{s.result}</span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        version {ver} · {s.history.length} snapshot(s)
      </div>
      <div className="mt-1 space-y-1">
        {Object.entries(cur).map(([k, v]) => (
          <div
            key={k}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            {k} = {v}
          </div>
        ))}
        {Object.keys(cur).length === 0 && (
          <span className={cn(vizText.sm, 'text-ink3')}>empty</span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>history timeline</div>
      <div className="mt-1 flex gap-1">
        {s.history.map((h, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === ver ? 'border-accent bg-accentbg' : 'border-edge text-ink3',
            )}
          >
            v{i}({Object.keys(h).length})
          </span>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<VcState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="version" v={s.version} />
      <InspectorRow k="snapshots" v={s.history.length} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-version-control-snapshot';
export const title = 'Version control snapshot';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Version control snapshot"?',
    choices: [
      {
        label: 'Copy-on-write version snapshots — fits this problem',
        correct: true,
      },
      {
        label: 'Stack — different approach',
      },
      {
        label: 'Two Heaps — different approach',
      },
      {
        label: 'Jump Array — different approach',
      },
    ],
    explain: 'Stack of maps; each set pushes a fresh copied snapshot layer',
  },
  {
    id: 'key-step',
    prompt: 'On the "SET" step (=), what happens?',
    choices: [
      {
        label: 'set("", ): copy-on-write → version . — this move caption',
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
    explain: 'set("", ): copy-on-write → version .',
  },
  {
    id: 'state',
    prompt: 'What does the `history` field track in the visualization state?',
    choices: [
      {
        label: 'Field history in state — updated each frame',
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
      'The recorder snapshots `history` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Version control snapshot"?',
    choices: [
      {
        label: 'O(versions) get time, O(changes) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(versions) get. O(changes). copy latest, set key, append; get reads history[version]',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. Current version = . — final DONE caption',
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
    explain: 'Done. Current version = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'vc1',
      label: 'set x, set y, get x@v0',
      value: {
        ops: [
          { kind: 'set', key: 'a', value: 1 },
          { kind: 'set', key: 'b', value: 2 },
          { kind: 'get', key: 'a', version: 0 },
          { kind: 'get', key: 'b', version: 1 },
        ],
      },
    },
  ] satisfies SampleInput<VcInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as VcState | undefined;
    return s?.done ? { ok: true, label: `v${s.version}` } : { ok: false, label: 'incomplete' };
  },
};
