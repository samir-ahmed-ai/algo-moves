import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type VcOp =
  | { kind: 'set'; key: string; value: number }
  | { kind: 'get'; key: string; version: number };

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
  const frames: Frame<VcState>[] = [];
  const history: Record<string, number>[] = [{}];

  const emit = (type: string, note: string, caption: string, s: Partial<VcState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        history: history.map((h) => ({ ...h })),
        version: history.length - 1,
        op: '',
        result: null,
        found: null,
        done: false,
        ...s,
      },
    });

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
        { op: `set ${o.key}=${o.value}`, version: history.length - 1, history: history.map((h) => ({ ...h })) },
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
        {s.found && s.result !== null && <span className="ml-2 font-mono text-good">{s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>version {ver} · {s.history.length} snapshot(s)</div>
      <div className="mt-1 space-y-1">
        {Object.entries(cur).map(([k, v]) => (
          <div key={k} className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
            {k} = {v}
          </div>
        ))}
        {Object.keys(cur).length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
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

export const simulator: ProblemSimulator = {
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
