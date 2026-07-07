import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Level-order tree: children of i live at 2i+1 and 2i+2, null marks a hole.
interface VerticalInput {
  tree: (number | null)[];
}

interface QItem {
  i: number; // level-order index into the tree
  col: number; // column offset: root=0, left=-1, right=+1
}

interface VerticalState {
  tree: (number | null)[];
  queue: QItem[]; // BFS frontier still to process
  visited: number[]; // tree indices already dequeued
  current: number | null; // tree index being processed this frame
  currentCol: number | null; // its column
  cols: [number, number[]][]; // column -> collected values, sorted by column
  minC: number;
  maxC: number;
  out: number[][] | null; // final grouped output, once assembled
  done: boolean;
}

function record({ tree }: VerticalInput): Frame<VerticalState>[] {
  const cols = new Map<number, number[]>();
  const visited: number[] = [];
  let minC = 0;
  let maxC = 0;
  let queue: QItem[] = [];

  const colsSorted = (): [number, number[]][] =>
    [...cols.entries()].sort((a, b) => a[0]! - b[0]!).map(([c, v]) => [c, v.slice()]);

  const { emit, frames } = createPrepRecorder<VerticalState>(() => ({
    tree,
    queue: queue.map((q) => ({ ...q })),
    visited: visited.slice(),
    current: null,
    currentCol: null,
    cols: colsSorted(),
    minC,
    maxC,
    out: null,
    done: false,
  }));

  if (tree.length === 0 || tree[0]! == null) {
    emit(
      'DONE',
      'empty',
      'The tree is empty, so there are no vertical columns to print.',
      { out: [], done: true },
      'bad',
    );
    return frames;
  }

  queue = [{ i: 0, col: 0 }];
  emit(
    'INIT',
    'root col 0',
    'Print Vertical assigns every node a column: root is column 0, going left subtracts 1, going right adds 1. We BFS level by level, dropping each value into its column bucket, then read buckets left-to-right.',
    {},
  );

  while (queue.length > 0) {
    const p = queue[0]!;
    queue = queue.slice(1);
    const val = tree[p!.i]! as number;

    emit(
      'DEQUEUE',
      `node ${val} @ col ${p!.col}`,
      `Dequeue node ${val}. It sits in column ${p!.col}, so we add ${val} to that column's bucket.`,
      { current: p!.i, currentCol: p!.col },
    );

    const bucket = cols.get(p!.col) ?? [];
    bucket.push(val);
    cols.set(p!.col, bucket);
    visited.push(p!.i);

    if (p!.col < minC) minC = p!.col;
    if (p!.col > maxC) maxC = p!.col;

    emit(
      'PLACE',
      `col ${p!.col} += ${val}`,
      `Column ${p!.col} now holds [${cols.get(p!.col)!.join(', ')}]. Columns seen so far span ${minC}..${maxC}.`,
      { current: p!.i, currentCol: p!.col },
    );

    const left = 2 * p!.i + 1;
    if (left < tree.length && tree[left]! != null) {
      queue.push({ i: left, col: p!.col - 1 });
      emit(
        'PUSH_LEFT',
        `enqueue ${tree[left]!} @ col ${p!.col - 1}`,
        `Node ${val} has a left child ${tree[left]!}; going left means column ${p!.col} − 1 = ${p!.col - 1}. Enqueue it.`,
        { current: p!.i, currentCol: p!.col },
      );
    }

    const right = 2 * p!.i + 2;
    if (right < tree.length && tree[right]! != null) {
      queue.push({ i: right, col: p!.col + 1 });
      emit(
        'PUSH_RIGHT',
        `enqueue ${tree[right]!} @ col ${p!.col + 1}`,
        `Node ${val} has a right child ${tree[right]!}; going right means column ${p!.col} + 1 = ${p!.col + 1}. Enqueue it.`,
        { current: p!.i, currentCol: p!.col },
      );
    }
  }

  const out: number[][] = [];
  for (let c = minC; c <= maxC; c++) {
    const v = cols.get(c);
    if (v) out.push(v.slice());
  }

  emit(
    'DONE',
    `${out.length} columns`,
    `BFS is complete. Reading columns from ${minC} to ${maxC} gives ${out.length} vertical groups: ${out.map((g) => `[${g.join(',')}]`).join(' ')}.`,
    { out, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<VerticalState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        columns <span className="font-mono text-ink">{s.minC}</span> …{' '}
        <span className="font-mono text-ink">{s.maxC}</span>
        {s.currentCol !== null && !s.done && (
          <>
            {' · '}current col = <span className="font-mono text-ink">{s.currentCol}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 flex flex-wrap gap-2 font-mono', vizText.sm)}>
        {s.cols.map(([c, vals]) => (
          <span key={c} className="text-ink3">
            <span className="text-ink2">col {c}</span>: [{vals.join(', ')}]
          </span>
        ))}
      </div>
      {s.out && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.out.map((g) => `[${g.join(',')}]`).join(' ')}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<VerticalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.current !== null ? s.tree[s.current]! : null;
  return (
    <VarGrid>
      <InspectorRow k="current node" v={cur ?? '—'} />
      <InspectorRow k="current col" v={s.currentCol ?? '—'} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="columns seen" v={s.cols.length} />
      <InspectorRow k="min..max col" v={`${s.minC}..${s.maxC}`} />
      <InspectorRow k="output" v={s.out ? `${s.out.length} cols` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-print-vertical';
export const title = 'Print vertical';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Print vertical"?',
    choices: [
      {
        label: 'Column map BFS — fits this problem',
        correct: true,
      },
      {
        label: 'N-ary iterative pre/post-order with stack — different approach',
      },
      {
        label: 'LCA + level distance BFS — different approach',
      },
      {
        label: 'Same tree check — different approach',
      },
    ],
    explain: 'Track a column offset: root=0, left is -1, right is +1',
  },
  {
    id: 'key-step',
    prompt: 'On the "PUSH_LEFT" step (enqueue  @ col ), what happens?',
    choices: [
      {
        label: 'Node has a left child ; — this move caption',
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
    explain: 'Node  has a left child ; going left means column  − 1 = . Enqueue it.',
  },
  {
    id: 'state',
    prompt: 'What does the `queue` field track in the visualization state?',
    choices: [
      {
        label: 'BFS frontier still to process — updated each frame',
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
    explain: 'The recorder keeps `queue` in sync: BFS frontier still to process',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Print vertical"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(n). BFS carrying col; map col->vals; emit min..max columns',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'BFS is complete. Reading columns — final DONE caption',
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
    explain: 'BFS is complete. Reading columns from  to  gives  vertical groups: ${out.map((g) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'pv1',
      label: '[3,9,20,null,null,15,7]',
      value: { tree: [3, 9, 20, null, null, 15, 7] },
    },
    {
      id: 'pv2',
      label: '[1,2,3,4,5,6,7]',
      value: { tree: [1, 2, 3, 4, 5, 6, 7] },
    },
  ] satisfies SampleInput<VerticalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as VerticalState | undefined;
    const out = s?.out ?? null;
    if (!out) return { ok: false, label: 'no output' };
    return { ok: true, label: out.map((g) => `[${g.join(',')}]`).join(' ') || 'empty' };
  },
};
