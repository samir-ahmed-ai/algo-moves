import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type SnapOp =
  | { kind: 'set'; index: number; val: number }
  | { kind: 'snap' }
  | { kind: 'get'; index: number; snapId: number };

interface SnapInput {
  length: number;
  ops: SnapOp[];
}

interface SnapState {
  length: number;
  snaps: [number, number][][];
  sid: number;
  op: string;
  result: number | null;
  done: boolean;
}

function record({ length, ops }: SnapInput): Frame<SnapState>[] {  const snaps: [number, number][][] = Array.from({ length }, () => [[0, 0]]);
  let sid = 0;

  const { emit, frames } = createRecorder<SnapState>(() => ({
        length,
        snaps: snaps.map((arr) => arr.map((x) => [...x] as [number, number])),
        sid,
        op: '',
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `len=${length}`,
    `Snapshot Array: each index stores [(snapId,val),...]. Set updates latest entry or appends; Snap() increments sid; Get binary-searches history.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'set') {
      const arr = snaps[o.index];
      if (arr[arr.length - 1][0] === sid) {
        arr[arr.length - 1][1] = o.val;
      } else {
        arr.push([sid, o.val]);
      }
      emit(
        'SET',
        `[${o.index}]=${o.val}`,
        `Set(${o.index}, ${o.val}) at snapId=${sid}: ${arr.length > 1 && arr[arr.length - 2][0] === sid ? 'update' : 'append'} history entry.`,
        { op: `set ${o.index}=${o.val}`, snaps: snaps.map((a) => a.map((x) => [...x] as [number, number])) },
      );
    } else if (o.kind === 'snap') {
      sid++;
      emit(
        'SNAP',
        `id=${sid - 1}`,
        `Snap(): snapshot id ${sid - 1} saved, sid→${sid}.`,
        { op: 'snap', sid, snaps: snaps.map((a) => a.map((x) => [...x] as [number, number])) },
        'good',
      );
    } else {
      const arr = snaps[o.index];
      let lo = 0;
      let hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid][0] <= o.snapId) lo = mid + 1;
        else hi = mid;
      }
      const val = arr[lo - 1][1];
      emit(
        'GET',
        `[${o.index}]=${val}`,
        `Get(${o.index}, snapId=${o.snapId}): binary search → val=${val}.`,
        { op: `get ${o.index}@${o.snapId}`, result: val, snaps: snaps.map((a) => a.map((x) => [...x] as [number, number])) },
        'good',
      );
    }
  }

  emit('DONE', `sid=${sid}`, `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SnapState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">{s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>snapId = {s.sid}</div>
      <div className="mt-1 space-y-1">
        {s.snaps.map((arr, i) => (
          <div key={i} className={cn('font-mono', vizText.sm, 'text-ink')}>
            [{i}]: {arr.map(([sid, val]) => `@${sid}:${val}`).join(' → ')}
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SnapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="snapId" v={s.sid} />
      <InspectorRow k="length" v={s.length} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-snapshot-array';
export const title = 'Snapshot Array';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sa1',
      label: 'set, snap, set, get',
      value: {
        length: 3,
        ops: [
          { kind: 'set', index: 0, val: 5 },
          { kind: 'snap' },
          { kind: 'set', index: 0, val: 6 },
          { kind: 'get', index: 0, snapId: 0 },
        ],
      },
    },
  ] satisfies SampleInput<SnapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SnapState | undefined;
    return s?.done ? { ok: true, label: `sid=${s.sid}` } : { ok: false, label: 'incomplete' };
  },
};
