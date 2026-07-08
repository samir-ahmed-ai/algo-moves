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

function record({ length, ops }: SnapInput): Frame<SnapState>[] {
  const snaps: [number, number][][] = Array.from({ length }, () => [[0, 0]]);
  let sid = 0;

  const { emit, frames } = createPrepRecorder<SnapState>(() => ({
    length,
    snaps: snaps.map((arr) => arr.map((x) => [...x] as [number, number])),
    sid,
    op: '',
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `len=${length}`,
    `Snapshot Array: each index stores [(snapId,val),...]. Set updates latest entry or appends; Snap() increments sid; Get binary-searches history.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'set') {
      const arr = snaps[o.index]!;
      if (arr![arr!.length - 1]![0] === sid) {
        arr![arr!.length - 1]![1] = o.val;
      } else {
        arr!.push([sid, o.val]);
      }
      emit(
        'SET',
        `[${o.index}]=${o.val}`,
        `Set(${o.index}, ${o.val}) at snapId=${sid}: ${arr!.length > 1 && arr![arr!.length - 2]![0] === sid ? 'update' : 'append'} history entry.`,
        {
          op: `set ${o.index}=${o.val}`,
          snaps: snaps.map((a) => a.map((x) => [...x] as [number, number])),
        },
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
      const arr = snaps[o.index]!;
      let lo = 0;
      let hi = arr!.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr![mid]![0] <= o.snapId) lo = mid + 1;
        else hi = mid;
      }
      const val = arr![lo - 1]![1];
      emit(
        'GET',
        `[${o.index}]=${val}`,
        `Get(${o.index}, snapId=${o.snapId}): binary search → val=${val}.`,
        {
          op: `get ${o.index}@${o.snapId}`,
          result: val,
          snaps: snaps.map((a) => a.map((x) => [...x] as [number, number])),
        },
        'good',
      );
    }
  }

  emit('DONE', `sid=${sid}`, `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SnapState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="snap">
        <RailStat k="id" v={s.sid} />
        <RailStat k="len" v={s.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
        {s.snaps.map((arr, i) => (
          <div key={i} className={cn('font-mono', vizText.sm, 'text-ink')}>
            [{i}]: {arr.map(([sid, val]) => `@${sid}:${val}`).join(' → ')}
          </div>
        ))}
      </div>
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does Snapshot Array store values over time?',
    choices: [
      {
        label: 'Per-index snap history — list of (snapId, val) pairs per cell',
        correct: true,
      },
      {
        label: 'Single flat array — overwrite in place on every Set',
      },
      {
        label: 'Copy-on-write map stack — full map snapshot per change',
      },
      {
        label: 'Point count hash map — tally diagonal square partners',
      },
    ],
    explain:
      'Each index keeps a time-ordered history; Snap() bumps sid so later Sets append new entries.',
  },
  {
    id: 'key-step',
    prompt: 'On GET(index, snapId), how is the answer found?',
    choices: [
      {
        label: 'Binary search history — largest snapId ≤ query wins',
        correct: true,
      },
      {
        label: 'Linear scan all cells — return current array slot only',
      },
      {
        label: 'Merge sorted intervals — check full range coverage',
      },
      {
        label: 'Pop lazy heap tops — discard stale timestamp prices',
      },
    ],
    explain:
      'Binary search on the index history finds the latest entry at or before the requested snapId.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical time and space bounds for Snapshot Array?',
    choices: [
      {
        label: 'O(log snaps) get, O(length × snaps) space — history per index',
        correct: true,
      },
      {
        label: 'O(1) all ops, O(length) space — one value per index only',
      },
      {
        label: 'O(n log n) every Set, O(1) space — resort entire array',
      },
      {
        label: 'O(points) per query, O(points) space — diagonal scan map',
      },
    ],
    explain:
      'Set is O(1) amortized append; Get binary-searches one index history; space stores all versions.',
  },
  {
    id: 'edge',
    prompt: 'When Set runs twice at the same snapId, what happens?',
    choices: [
      {
        label: 'Update latest entry — no new history tuple is appended',
        correct: true,
      },
      {
        label: 'Reject second Set — return false on duplicate snap write',
      },
      {
        label: 'Always append — even if snapId matches the tail entry',
      },
      {
        label: 'Reset entire array — clear all prior snapshots first',
      },
    ],
    explain:
      'If the last history pair already has the current sid, only its value field is overwritten.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
