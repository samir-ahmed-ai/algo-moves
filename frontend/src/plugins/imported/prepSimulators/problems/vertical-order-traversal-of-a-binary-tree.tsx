import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

// The tree is provided in level-order (heap layout): children of index i are
// 2i+1 (left) and 2i+2 (right); `null` marks an absent slot. TreeBoard consumes
// this exact shape, so the BFS and the board are driven off one array.
interface VerticalInput {
  tree: (number | null)[];
}

// One recorded node inside a column bucket: its row (BFS depth) and value.
interface Pt {
  row: number;
  val: number;
}

interface VerticalState {
  tree: (number | null)[];
  visited: number[]; // node indices already dequeued + recorded
  current: number | null; // node index dequeued this step
  queue: number[]; // node indices waiting in the BFS queue
  colOf: [number, number][]; // node index -> its column
  rowOf: [number, number][]; // node index -> its row (depth)
  buckets: [number, Pt[]][]; // column -> recorded (row,val) points, in BFS order
  currentCol: number | null; // column of the current node
  sortingCol: number | null; // column being sorted in the final sweep
  result: number[][] | null; // final left-to-right grouping when done
  done: boolean;
}

function record({ tree }: VerticalInput): Frame<VerticalState>[] {
  // BFS bookkeeping mirrors the Go solution: a queue of node indices, per-node
  // (row, col), and a map col -> list of (row, val) points. Root sits at
  // (row 0, col 0); a left child is (row+1, col-1), a right child is (row+1,
  // col+1). Min/max column bound the final left-to-right sweep.
  const visited: number[] = [];
  const colByNode = new Map<number, number>();
  const rowByNode = new Map<number, number>();
  const cols = new Map<number, Pt[]>();
  let queue: number[] = [];

  const bucketEntries = (): [number, Pt[]][] =>
    [...cols.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([c, pts]) => [c, pts.map((p) => ({ ...p }))]);

  const { emit, frames } = createRecorder<VerticalState>(() => ({
    tree,
    visited: visited.slice(),
    current: null,
    queue: queue.slice(),
    colOf: [...colByNode.entries()],
    rowOf: [...rowByNode.entries()],
    buckets: bucketEntries(),
    currentCol: null,
    sortingCol: null,
    result: null,
    done: false,
  }));

  if (tree.length === 0 || tree[0] == null) {
    emit(
      'DONE',
      'empty',
      'The tree is empty, so the vertical order traversal is an empty list.',
      { done: true },
      'bad',
    );
    return frames;
  }

  colByNode.set(0, 0);
  rowByNode.set(0, 0);
  queue = [0];
  emit(
    'INIT',
    'root (0,0)',
    `Vertical Order Traversal groups nodes by column. Root ${tree[0]} starts at (row 0, col 0). We BFS level by level: a left child is one row down and one column left (row+1, col−1); a right child is one row down and one column right (row+1, col+1). Each column also remembers the row so ties can be broken later by (row, value).`,
    { queue: [0] },
  );

  while (queue.length > 0) {
    const i = queue[0];
    queue = queue.slice(1);
    const col = colByNode.get(i)!;
    const row = rowByNode.get(i)!;
    const val = tree[i] as number;

    // Record this node's (row, val) into its column bucket.
    const bucket = cols.get(col) ?? [];
    bucket.push({ row, val });
    cols.set(col, bucket);
    visited.push(i);

    emit(
      'VISIT',
      `${val}@(${row},${col})`,
      `Dequeue node ${val} at (row ${row}, col ${col}) and append (${row}, ${val}) to column ${col}. Storing the row lets us later sort each column by (row, value), which decides the order when two nodes share the same cell.`,
      { current: i, currentCol: col },
    );

    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < tree.length && tree[left] != null) {
      colByNode.set(left, col - 1);
      rowByNode.set(left, row + 1);
      queue = [...queue, left];
      emit(
        'ENQUEUE',
        `${tree[left]}→(${row + 1},${col - 1})`,
        `Node ${val} has a left child ${tree[left]}. A left child goes one row down and one column left, to (row ${row + 1}, col ${col - 1}). Enqueue it.`,
        { current: i, currentCol: col },
      );
    }
    if (right < tree.length && tree[right] != null) {
      colByNode.set(right, col + 1);
      rowByNode.set(right, row + 1);
      queue = [...queue, right];
      emit(
        'ENQUEUE',
        `${tree[right]}→(${row + 1},${col + 1})`,
        `Node ${val} has a right child ${tree[right]}. A right child goes one row down and one column right, to (row ${row + 1}, col ${col + 1}). Enqueue it.`,
        { current: i, currentCol: col },
      );
    }
  }

  // Sweep columns from smallest (leftmost) to largest (rightmost). Within each
  // column, sort by (row, value): shallower rows come first, and ties on the
  // same row are broken by the smaller value.
  const sortedCols = [...cols.keys()].sort((a, b) => a - b);
  const result: number[][] = [];
  for (const c of sortedCols) {
    const pts = cols.get(c)!;
    const before = pts.map((p) => p.val);
    pts.sort((a, b) => (a.row === b.row ? a.val - b.val : a.row - b.row));
    const after = pts.map((p) => p.val);
    cols.set(c, pts);
    const changed = before.join(',') !== after.join(',');
    emit(
      'SORT',
      `col ${c}`,
      changed
        ? `Sort column ${c} by (row, value): [${before.join(', ')}] → [${after.join(', ')}]. Two nodes shared a row, so the smaller value is placed first.`
        : `Sort column ${c} by (row, value): [${after.join(', ')}] is already in order (rows increase top to bottom, no same-row ties to break).`,
      { sortingCol: c },
    );
    result.push(after);
  }

  emit(
    'DONE',
    `${result.length} cols`,
    `Reading the sorted columns left to right gives the answer: ${result.map((c) => `[${c.join(',')}]`).join(', ')}.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<VerticalState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) =>
    s.current === i ? 'team-1' : visitedSet.has(i) ? 'team-2' : 'team-0';
  const colMap = new Map(s.colOf);

  const queueItems = s.queue.map((i) => {
    const col = colMap.get(i) ?? '?';
    return `${s.tree[i]} (c${col})`;
  });

  const bucketItems = s.buckets.map(([c, pts]) => ({
    label: `c${c}:[${pts.map((p) => p.val).join(',')}]`,
    tone: s.sortingCol === c ? ('accent' as const) : undefined,
  }));

  const resultLabel = s.result ? s.result.map((c) => `[${c.join(',')}]`).join(' ') : undefined;

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="node" v={s.current !== null ? (s.tree[s.current] ?? '—') : '—'} />
        <RailStat
          k="col"
          v={s.currentCol ?? (s.sortingCol !== null ? `sort ${s.sortingCol}` : '—')}
          tone={s.currentCol !== null ? 'accent' : undefined}
        />
      </RailGroup>
      <RailStack label="queue" items={queueItems} topLabel="front" highlightEnd="bottom" />
      <RailStack label="columns" items={bucketItems.length > 0 ? bucketItems : []} />
      {resultLabel && <RailResult label="result" value={resultLabel} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<VerticalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.current !== null ? (s.tree[s.current] ?? '—') : '—'} />
      <InspectorRow k="current col" v={s.currentCol ?? '—'} />
      <InspectorRow k="sorting col" v={s.sortingCol ?? '—'} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="columns filled" v={s.buckets.length} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow
        k="result"
        v={s.result ? s.result.map((c) => `[${c.join(',')}]`).join(' ') : s.done ? 'none' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-vertical-order-traversal-of-a-binary-tree';
export const title = 'Vertical Order Traversal of a Binary Tree';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Vertical Order Traversal of a Binary Tree"?',
    choices: [
      {
        label: 'BFS + Sort per column — fits this problem',
        correct: true,
      },
      {
        label: 'BST range check — different approach',
      },
      {
        label: 'DFS right-first — different approach',
      },
      {
        label: 'DFS path — different approach',
      },
    ],
    explain: 'BFS tracking `(row, col)` for each node. Group by column.',
  },
  {
    id: 'key-step',
    prompt: 'On the "ENQUEUE" step (→(,)), what happens?',
    choices: [
      {
        label: 'Node has a left child . — this move caption',
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
    explain:
      'Node  has a left child . A left child goes one row down and one column left, to (row , col ). Enqueue it.',
  },
  {
    id: 'state',
    prompt: 'What does the `visited` field track in the visualization state?',
    choices: [
      {
        label: 'node indices already dequeued + — updated each frame',
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
    explain: 'The recorder keeps `visited` in sync: node indices already dequeued + recorded',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Vertical Order Traversal of a Binary Tree"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) amortized time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n log n). O(n). BFS tracking `(row, col)` for each node. Group by column.; Within each column, sort by `(row, value)`.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Reading the sorted columns left — final DONE caption',
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
    explain: 'Reading the sorted columns left to right gives the answer: ${result.map((c) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'vt1',
      label: '[3,9,20,·,·,15,7]',
      value: { tree: [3, 9, 20, null, null, 15, 7] },
    },
    {
      id: 'vt2',
      label: '[1,2,3,4,6,5,7]',
      value: { tree: [1, 2, 3, 4, 6, 5, 7] },
    },
  ] satisfies SampleInput<VerticalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as VerticalState | undefined;
    const res = s?.result;
    if (!res) return { ok: false, label: 'empty' };
    return { ok: true, label: res.map((c) => `[${c.join(',')}]`).join(' ') };
  },
};
