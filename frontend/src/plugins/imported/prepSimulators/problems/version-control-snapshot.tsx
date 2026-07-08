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

  const { emit, frames } = createPrepRecorder<VcState>(() => ({
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
    `Version Control Snapshot: each set() copies previous map and appends new version. get(key, version) reads history[version]!.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'set') {
      const cur = history[history.length - 1]!;
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
      const val = ok ? history[o.version]![o.key] : undefined;
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
  const cur = s.history[ver]! ?? {};
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.found && s.result !== null && <RailStat k="val" v={s.result} tone="good" />}
      </RailGroup>
      <RailGroup label="version">
        <RailStat k="cur" v={`v${ver}`} />
        <RailStat k="snaps" v={s.history.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
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
      <div className="mt-2 flex gap-1">
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
    </VizStage>
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
    prompt: 'How does version control snapshot store history?',
    choices: [
      {
        label: 'Stack of map snapshots — copy-on-write append per set',
        correct: true,
      },
      {
        label: 'Per-index snap tuples — binary search by snapId',
      },
      {
        label: 'Message timestamp map — ten-second dedupe window',
      },
      {
        label: 'Point count hash — diagonal square partner lookup',
      },
    ],
    explain:
      'history[] holds immutable map layers; set copies the latest map and pushes a new version.',
  },
  {
    id: 'key-step',
    prompt: 'On SET(key, value), how is a new version created?',
    choices: [
      {
        label: 'Copy latest map — spread prior keys then write updated key',
        correct: true,
      },
      {
        label: 'Mutate latest map in place — overwrite without new layer',
      },
      {
        label: 'Delete prior versions — keep only current key/value pair',
      },
      {
        label: 'Merge all versions — fold history into one map first',
      },
    ],
    explain:
      'const next = { ...cur, [key]: value }; history.push(next) appends an immutable snapshot.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for version snapshot storage?',
    choices: [
      {
        label: 'O(changes) per set, O(V×keys) space — layered map copies',
        correct: true,
      },
      {
        label: 'O(1) set and get, O(1) space — single mutable hash only',
      },
      {
        label: 'O(V log V) set, O(1) space — sort versions each write',
      },
      {
        label: 'O(n) get only, O(1) space — recompute from empty each read',
      },
    ],
    explain: 'Each set copies the prior map plus one change; get reads history[version] directly.',
  },
  {
    id: 'edge',
    prompt: 'What does get(key, version) return when the key was never set in that version?',
    choices: [
      {
        label: 'MISS — key missing even if version index is valid',
        correct: true,
      },
      {
        label: 'Zero default — undefined keys read as numeric zero',
      },
      {
        label: 'Latest value — fall forward to current version automatically',
      },
      {
        label: 'Invalid version error — reject any key not in v0 map',
      },
    ],
    explain:
      'Valid version with val === undefined emits MISS because that key absent in that snapshot.',
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
