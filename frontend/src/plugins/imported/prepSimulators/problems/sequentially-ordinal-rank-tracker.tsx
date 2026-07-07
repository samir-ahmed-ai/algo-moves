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

type SorOp = { kind: 'add'; name: string; score: number } | { kind: 'get' };

interface SorInput {
  ops: SorOp[];
}

interface Loc {
  name: string;
  score: number;
}

interface SorState {
  locs: Loc[];
  idx: number;
  op: string;
  result: string;
  done: boolean;
}

function insertSorted(locs: Loc[], name: string, score: number): Loc[] {
  const l = { name, score };
  let lo = 0;
  let hi = locs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const cur = locs[mid];
    const before = cur.score < score || (cur.score === score && cur.name > name);
    if (before) lo = mid + 1;
    else hi = mid;
  }
  const out = locs.slice();
  out.splice(lo, 0, l);
  return out;
}

function record({ ops }: SorInput): Frame<SorState>[] {
  let locs: Loc[] = [];
  let idx = 0;

  const { emit, frames } = createRecorder<SorState>(() => ({
    locs: locs.map((x) => ({ ...x })),
    idx,
    op: '',
    result: '',
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    `Sequentially Ordinal Rank Tracker: sorted by (score asc, name desc). Add inserts; Get returns locs[idx++] in that order.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'add') {
      locs = insertSorted(locs, o.name, o.score);
      emit(
        'ADD',
        `${o.name}@${o.score}`,
        `Add("${o.name}", ${o.score}): binary-search insert. Rank list: [${locs.map((x) => `${x.name}:${x.score}`).join(', ')}].`,
        { op: `add ${o.name}`, locs: locs.map((x) => ({ ...x })) },
      );
    } else {
      const res = locs[idx]?.name ?? '';
      emit(
        'GET',
        res,
        `Get(): return "${res}" (ordinal rank ${idx + 1}), then idx→${idx + 1}.`,
        { op: 'get', result: res, idx, locs: locs.map((x) => ({ ...x })) },
        'good',
      );
      idx++;
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SorState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result && <span className="ml-2 font-mono text-good">{s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>idx = {s.idx} · sorted ranks</div>
      <div className="mt-1 space-y-0.5">
        {s.locs.map((loc, i) => (
          <div
            key={`${loc.name}-${i}`}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.idx ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            #{i + 1} {loc.name} ({loc.score})
          </div>
        ))}
        {s.locs.length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SorState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="idx" v={s.idx} />
      <InspectorRow k="size" v={s.locs.length} />
      <InspectorRow k="result" v={s.result || '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-sequentially-ordinal-rank-tracker';
export const title = 'Sequentially Ordinal Rank Tracker';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Sequentially Ordinal Rank Tracker"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
    ],
    explain: 'See Sequentially Ordinal Rank Tracker pattern',
  },
  {
    id: 'key-step',
    prompt: 'On the "ADD" step (@), what happens?',
    choices: [
      {
        label: 'Add("", ): binary-search insert. Rank — this move caption',
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
    explain: 'Add("", ): binary-search insert. Rank list: [${locs.map((x) => ',
  },
  {
    id: 'state',
    prompt: 'What does the `locs` field track in the visualization state?',
    choices: [
      {
        label: 'Field locs in state — updated each frame',
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
      'The recorder snapshots `locs` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Add("", ): binary-search insert. Rank — final DONE caption',
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
    explain: 'Add("", ): binary-search insert. Rank list: [${locs.map((x) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'sor1',
      label: 'add 3 · get 2',
      value: {
        ops: [
          { kind: 'add', name: 'bradford', score: 2 },
          { kind: 'add', name: 'branta', score: 3 },
          { kind: 'add', name: 'alameda', score: 3 },
          { kind: 'get' },
          { kind: 'get' },
        ],
      },
    },
  ] satisfies SampleInput<SorInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SorState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};
