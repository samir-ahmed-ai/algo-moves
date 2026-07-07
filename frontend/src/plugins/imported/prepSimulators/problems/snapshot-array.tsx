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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Snapshot Array"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
      {
        label: 'Trie phone directory autocomplete — different approach',
      },
    ],
    explain: 'See Snapshot Array pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Snapshot Array), what strategy is established?',
    choices: [
      {
        label: 'See Snapshot Array pattern — described in INIT caption',
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
      'Snapshot Array: each index stores [(snapId,val),...]. Set updates latest entry or appends; Snap() increments sid; Get binary-searches history.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SNAP" step (id=), what happens?',
    choices: [
      {
        label: 'Snap(): snapshot id saved, sid→. — this move caption',
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
    explain: 'Snap(): snapshot id  saved, sid→.',
  },
  {
    id: 'state',
    prompt: 'What does the `length` field track in the visualization state?',
    choices: [
      {
        label: 'Field length in state — updated each frame',
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
      'The recorder snapshots `length` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. — final DONE caption',
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
    explain: 'Done.',
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
