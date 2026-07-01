import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface ZigzagInput {
  // Level-order array; null marks an absent node. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface ZigzagState {
  tree: (number | null)[];
  visited: number[]; // node indices already dequeued and recorded
  queue: number[]; // node indices currently in the BFS queue (level-order tree indices)
  active: number | null; // node index currently being processed
  ltr: boolean; // current level direction: left-to-right?
  levelBuf: (number | null)[]; // the value slots being filled for the current level
  levelNo: number; // current level number (0-based)
  result: number[][]; // completed levels, in zigzag order
  done: boolean;
}

// Follow the queue in insertion order, but keep the level-order *tree index*
// alongside each node so the TreeBoard can highlight the right circle.
function record({ tree }: ZigzagInput): Frame<ZigzagState>[] {
  const val = (i: number): number => tree[i] as number;

  const visited: number[] = [];
  const result: number[][] = [];

  const { emit, frames } = createRecorder<ZigzagState>(() => ({
    tree,
    visited: visited.slice(),
    queue: [],
    active: null,
    ltr: true,
    levelBuf: [],
    levelNo: 0,
    result: result.map((r) => r.slice()),
    done: false,
  }));

  if (tree.length === 0 || tree[0] == null) {
    emit('DONE', 'empty', 'The tree is empty, so the zigzag traversal is an empty list.', {
      done: true,
    }, 'good');
    return frames;
  }

  emit(
    'INIT',
    'root → queue',
    'Zigzag level order: run a normal BFS level by level, but flip the fill direction each level. Seed the queue with the root and start left-to-right.',
    { queue: [0], ltr: true, levelNo: 0 },
  );

  let queue: number[] = [0];
  let ltr = true;
  let levelNo = 0;

  while (queue.length > 0) {
    const sz = queue.length;
    const levelBuf: (number | null)[] = new Array<number | null>(sz).fill(null);
    const levelIdx = queue.slice();

    emit(
      'LEVEL',
      `level ${levelNo} · ${ltr ? 'L→R' : 'R→L'}`,
      `Start level ${levelNo} with ${sz} node${sz === 1 ? '' : 's'}. Direction is ${ltr ? 'left-to-right' : 'right-to-left'}, so each node dequeued at position i lands at slot ${ltr ? 'i' : `${sz}−1−i`} of this level.`,
      { queue: levelIdx, ltr, levelNo, levelBuf: levelBuf.slice() },
    );

    const next: number[] = [];
    for (let i = 0; i < sz; i++) {
      const node = queue[i];
      const idx = ltr ? i : sz - 1 - i;
      levelBuf[idx] = val(node);
      visited.push(node);

      // Remaining queue after conceptually dequeuing this node.
      const remaining = queue.slice(i + 1);

      emit(
        'PLACE',
        `${val(node)} → slot ${idx}`,
        `Dequeue node ${val(node)} (position ${i} in this level) and place its value at slot ${idx} because the level fills ${ltr ? 'left-to-right' : 'right-to-left'}.`,
        {
          queue: [...remaining, ...next],
          active: node,
          ltr,
          levelNo,
          levelBuf: levelBuf.slice(),
        },
      );

      const left = 2 * node + 1;
      const right = 2 * node + 2;
      if (left < tree.length && tree[left] != null) next.push(left);
      if (right < tree.length && tree[right] != null) next.push(right);
    }

    result.push(levelBuf.map((v) => v as number));
    emit(
      'COMMIT',
      `[${levelBuf.join(', ')}]`,
      `Level ${levelNo} is complete: [${levelBuf.join(', ')}]. Enqueue this level's children (${next.length} node${next.length === 1 ? '' : 's'}) and flip the direction for the next level.`,
      {
        queue: next.slice(),
        ltr,
        levelNo,
        levelBuf: levelBuf.slice(),
      },
      'good',
    );

    queue = next;
    ltr = !ltr;
    levelNo += 1;
  }

  const flat = result.map((r) => `[${r.join(',')}]`).join(', ');
  emit(
    'DONE',
    `${result.length} levels`,
    `Every level has been processed. The zigzag level order is [${flat}].`,
    { done: true, result: result.map((r) => r.slice()) },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ZigzagState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const queueSet = new Set(s.queue);

  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    if (queueSet.has(i)) return 'team-1';
    return 'team-0';
  };

  const displayTree = s.tree.map((v) => (v == null ? null : v));
  const queueVals = s.queue.map((i) => String(s.tree[i] as number));
  const levelBufVals = s.levelBuf.map((v) => (v == null ? '·' : String(v)));
  const resultLabel = s.result.length ? s.result.map((r) => `[${r.join(',')}]`).join(' ') : '…';

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="level" v={s.levelNo} />
        <RailStat k="dir" v={s.ltr ? 'L→R' : 'R→L'} tone="accent" />
        <RailStat k="active" v={s.active !== null ? (s.tree[s.active] as number) : '—'} />
      </RailGroup>
      <RailStack label="queue" items={queueVals} topLabel="front" highlightEnd="bottom" />
      {!s.done && levelBufVals.length > 0 && (
        <RailStack label="level buf" items={levelBufVals} />
      )}
      {s.result.length > 0 && (
        <RailResult label="result" value={resultLabel} tone={s.done ? 'good' : 'accent'} />
      )}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={displayTree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ZigzagState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const queueVals = s.queue.map((i) => s.tree[i] as number);
  return (
    <VarGrid>
      <InspectorRow k="level" v={s.levelNo} />
      <InspectorRow k="direction" v={s.ltr ? 'L→R' : 'R→L'} />
      <InspectorRow k="active" v={s.active !== null ? (s.tree[s.active] as number) : '—'} />
      <InspectorRow k="queue" v={queueVals.length ? `[${queueVals.join(', ')}]` : '[]'} />
      <InspectorRow k="levels done" v={s.result.length} />
      <InspectorRow k="result" v={s.result.length ? s.result.map((r) => `[${r.join(',')}]`).join(' ') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-tree-zigzag-level-order-traversal';
export const title = 'Binary Tree Zigzag Level Order Traversal';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'zz1', label: '[3,9,20,null,null,15,7]', value: { tree: [3, 9, 20, null, null, 15, 7] } },
    { id: 'zz2', label: '[1,2,3,4,5,6,7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
  ] satisfies SampleInput<ZigzagInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ZigzagState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const label = s.result.map((r) => `[${r.join(',')}]`).join(' ') || '[]';
    return { ok: true, label };
  },
};
