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
    const cur = locs[mid]!;
    const before = cur!.score < score || (cur!.score === score && cur!.name > name);
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

  const { emit, frames } = createPrepRecorder<SorState>(() => ({
    locs: locs.map((x) => ({ ...x })),
    idx,
    op: '',
    result: '',
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    `Sequentially Ordinal Rank Tracker: sorted by (score asc, name desc). Add inserts; Get returns locs[idx++]! in that order.`,
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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.result && <RailStat k="out" v={s.result} tone="good" />}
      </RailGroup>
      <RailGroup label="rank">
        <RailStat k="idx" v={s.idx} />
        <RailStat k="size" v={s.locs.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-0.5">
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
    </VizStage>
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
    prompt: 'How are locations ordered in the rank tracker?',
    choices: [
      {
        label: 'Sorted by score asc — tie-break name descending lex order',
        correct: true,
      },
      {
        label: 'Insertion order queue — FIFO list of added names',
      },
      {
        label: 'Hash by name — unsorted map iteration for Get calls',
      },
      {
        label: 'Min-heap by score — pop smallest on every Get request',
      },
    ],
    explain:
      'insertSorted binary-searches the rank list using (score, name) ordering from the comparator.',
  },
  {
    id: 'key-step',
    prompt: 'On GET, how is the next ordinal rank returned?',
    choices: [
      {
        label: 'Return locs[idx].name — then increment idx for next Get',
        correct: true,
      },
      {
        label: 'Pop front of list — remove returned name from ranks',
      },
      {
        label: 'Random index pick — uniform among remaining locs',
      },
      {
        label: 'Highest score always — ignore idx sequential counter',
      },
    ],
    explain: 'Get reads locs[idx]?.name, emits result, and idx++ walks ranks in sorted order.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Sequentially Ordinal Rank Tracker?',
    choices: [
      {
        label: 'O(n) add insert, O(1) get, O(n) space — sorted array storage',
        correct: true,
      },
      {
        label: 'O(log n) add and get, O(1) space — tree without stored list',
      },
      {
        label: 'O(1) add, O(n) get, O(1) space — scan unsorted array each get',
      },
      {
        label: 'O(n log n) every op, O(n²) space — duplicate sorted copies',
      },
    ],
    explain: 'Add splices into sorted locs; Get is O(1) array access at moving idx pointer.',
  },
  {
    id: 'edge',
    prompt: 'When two locations share the same score, who ranks earlier?',
    choices: [
      {
        label: 'Lexicographically larger name — name desc breaks score ties',
        correct: true,
      },
      {
        label: 'Earlier Add call — insertion order overrides score ties',
      },
      {
        label: 'Smaller name first — ascending lex tie-break rule',
      },
      {
        label: 'Random tie shuffle — reorder equal scores each Add',
      },
    ],
    explain:
      'Comparator treats cur.score === score && cur.name > name as before, placing larger names first.',
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
