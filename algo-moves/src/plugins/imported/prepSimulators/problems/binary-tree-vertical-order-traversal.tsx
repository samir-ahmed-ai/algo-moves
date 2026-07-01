import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// The tree is provided in level-order (heap layout): children of index i are
// 2i+1 (left) and 2i+2 (right); `null` marks an absent slot. TreeBoard consumes
// this exact shape, so we drive both the BFS and the board off one array.
interface VerticalOrderInput {
  tree: (number | null)[];
}

interface VerticalOrderState {
  tree: (number | null)[];
  visited: number[]; // node indices already popped + recorded
  current: number | null; // node index popped this step
  queue: number[]; // node indices currently waiting in the BFS queue
  colOf: [number, number][]; // node index -> its column
  cols: [number, string][]; // column -> comma-joined values recorded there
  currentCol: number | null; // column of the current node
  result: number[][] | null; // final left-to-right grouping when done
  done: boolean;
}

function record({ tree }: VerticalOrderInput): Frame<VerticalOrderState>[] {
  const frames: Frame<VerticalOrderState>[] = [];

  // BFS bookkeeping mirrors the Go solution: a queue of (nodeIndex, col), a
  // map col -> values, and running min/max column. Root sits at column 0,
  // every left child is col-1, every right child is col+1.
  const visited: number[] = [];
  const colByNode = new Map<number, number>();
  const cols = new Map<number, number[]>();
  let queue: number[] = [];

  const colEntries = (): [number, string][] =>
    [...cols.entries()].sort((a, b) => a[0] - b[0]).map(([c, vals]) => [c, vals.join(',')]);

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<VerticalOrderState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        visited: visited.slice(),
        current: null,
        queue: queue.slice(),
        colOf: [...colByNode.entries()],
        cols: colEntries(),
        currentCol: null,
        result: null,
        done: false,
        ...s,
      },
    });

  if (tree.length === 0 || tree[0] == null) {
    emit('DONE', 'empty', 'The tree is empty, so the vertical order traversal is an empty list.', { done: true }, 'bad');
    return frames;
  }

  colByNode.set(0, 0);
  queue = [0];
  emit(
    'INIT',
    'root col 0',
    `Vertical Order Traversal groups nodes by column. Root ${tree[0]} starts at column 0. We BFS level by level: a left child is one column left (col−1), a right child is one column right (col+1). BFS order guarantees top-to-bottom, left-to-right within each column.`,
    { queue: [0] },
  );

  while (queue.length > 0) {
    const i = queue[0];
    queue = queue.slice(1);
    const col = colByNode.get(i)!;
    const val = tree[i] as number;

    // Record this node's value into its column bucket, in dequeue order.
    const bucket = cols.get(col) ?? [];
    bucket.push(val);
    cols.set(col, bucket);
    visited.push(i);

    emit(
      'VISIT',
      `${val}@col ${col}`,
      `Dequeue node ${val} (column ${col}) and append it to column ${col}: [${bucket.join(', ')}]. Because we dequeue in BFS order, this value lands after any node above it in the same column.`,
      { current: i, currentCol: col },
    );

    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < tree.length && tree[left] != null) {
      colByNode.set(left, col - 1);
      queue = [...queue, left];
      emit(
        'ENQUEUE',
        `${tree[left]}→col ${col - 1}`,
        `Node ${val} has a left child ${tree[left]}. A left child sits one column to the left, so it goes to column ${col - 1}. Enqueue it.`,
        { current: i, currentCol: col },
      );
    }
    if (right < tree.length && tree[right] != null) {
      colByNode.set(right, col + 1);
      queue = [...queue, right];
      emit(
        'ENQUEUE',
        `${tree[right]}→col ${col + 1}`,
        `Node ${val} has a right child ${tree[right]}. A right child sits one column to the right, so it goes to column ${col + 1}. Enqueue it.`,
        { current: i, currentCol: col },
      );
    }
  }

  // Sweep columns from smallest (leftmost) to largest (rightmost) to build
  // the final left-to-right list of columns.
  const sorted = [...cols.entries()].sort((a, b) => a[0] - b[0]);
  const result = sorted.map(([, vals]) => vals);
  emit(
    'DONE',
    `${result.length} cols`,
    `The queue is empty. Reading columns left to right gives the answer: ${result.map((c) => `[${c.join(',')}]`).join(', ')}.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<VerticalOrderState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) =>
    s.current === i ? 'team-1' : visitedSet.has(i) ? 'team-2' : 'team-0';
  const colMap = new Map(s.colOf);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.current !== null && s.currentCol !== null && !s.done ? (
          <>
            visiting <span className="font-mono text-ink">{s.tree[s.current]}</span> · column{' '}
            <span className="font-mono text-ink">{s.currentCol}</span>
          </>
        ) : (
          <>columns: root = 0, left = −1, right = +1</>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 flex flex-wrap gap-2 font-mono', vizText.sm, 'text-ink3')}>
        {s.cols.length === 0 ? (
          <span>columns: —</span>
        ) : (
          s.cols.map(([c, vals]) => (
            <span key={c}>
              col {c}: [{vals}]
            </span>
          ))
        )}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        queue [{s.queue.map((i) => s.tree[i]).join(', ')}]
        {s.colOf.length > 0 && s.queue.length > 0 && (
          <span className="text-ink3">
            {' '}
            (cols {s.queue.map((i) => colMap.get(i) ?? '?').join(', ')})
          </span>
        )}
      </div>
      {s.result && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.result.map((c) => `[${c.join(',')}]`).join(', ')}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<VerticalOrderState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.current !== null ? (s.tree[s.current] ?? '—') : '—'} />
      <InspectorRow k="current col" v={s.currentCol ?? '—'} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="columns filled" v={s.cols.length} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow
        k="result"
        v={s.result ? s.result.map((c) => `[${c.join(',')}]`).join(' ') : s.done ? 'none' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-tree-vertical-order-traversal';
export const title = 'Binary Tree Vertical Order Traversal';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'vo1',
      label: '[3,9,20,·,·,15,7]',
      value: { tree: [3, 9, 20, null, null, 15, 7] },
    },
    {
      id: 'vo2',
      label: '[1,2,3,4,5,6,7]',
      value: { tree: [1, 2, 3, 4, 5, 6, 7] },
    },
  ] satisfies SampleInput<VerticalOrderInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as VerticalOrderState | undefined;
    const res = s?.result;
    if (!res) return { ok: false, label: 'empty' };
    return { ok: true, label: res.map((c) => `[${c.join(',')}]`).join(' ') };
  },
};
