import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface FlipTreeInput {
  /** Level-order array; null marks an absent child. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface FlipTreeState {
  tree: (number | null)[]; // current (partially flipped) level-order array
  current: number | null; // node index whose children we are swapping now
  swapped: number[]; // node indices whose children have already been swapped
  done: boolean;
}

/**
 * Relocate the subtree rooted at level-order index `from` into slot `to`,
 * preserving its internal left/right orientation. We use this to physically move
 * an already-flipped subtree to the opposite side of its parent — the swap step
 * of  root.Left, root.Right = flip(Right), flip(Left).  The subtrees themselves
 * are flipped by the post-order recursion before this runs, so here we must NOT
 * mirror internals again (that would undo a level of the flip); we just carry the
 * subtree across unchanged.
 */
function copySubtree(src: (number | null)[], dst: (number | null)[], from: number, to: number) {
  if (from >= src.length || src[from] == null) return;
  ensure(dst, to);
  dst[to] = src[from];
  // src left  (2*from+1) → dst left  (2*to+1)  — orientation preserved
  copySubtree(src, dst, 2 * from + 1, 2 * to + 1);
  // src right (2*from+2) → dst right (2*to+2)
  copySubtree(src, dst, 2 * from + 2, 2 * to + 2);
}

function ensure(arr: (number | null)[], i: number) {
  while (arr.length <= i) arr.push(null);
}

function record({ tree }: FlipTreeInput): Frame<FlipTreeState>[] {
  const frames: Frame<FlipTreeState>[] = [];
  // Working copy we mutate as we flip, re-rendered into each frame's state.
  const work: (number | null)[] = tree.slice();
  const swapped: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    current: number | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree: work.slice(),
        current,
        swapped: swapped.slice(),
        done,
      },
    });

  emit(
    'INIT',
    'flip every node',
    'Flip Tree: invert the tree by swapping the left and right child of every node. The rule is Left, Right = flip(Right), flip(Left) — recurse first, then swap on the way back up. We walk in post-order so a node is flipped only after both of its subtrees are already flipped.',
    null,
    false,
  );

  // Faithful recursion of flipTree: recurse into (already-in-place) children,
  // then swap this node's two subtrees in the working array.
  const flip = (i: number) => {
    if (i >= work.length || work[i] == null) return; // root == nil → return nil

    const val = work[i];
    emit(
      'ENTER',
      `node ${val}`,
      `Enter node ${val} (index ${i}). Before swapping here we first recurse into its right subtree, then its left — flip(Right) and flip(Left) must finish first.`,
      i,
      false,
    );

    // flip(Right) then flip(Left) — the Go line evaluates both calls first.
    flip(2 * i + 2);
    flip(2 * i + 1);

    // Now swap: Left, Right = flip(Right), flip(Left).
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    const hasChild =
      (left < work.length && work[left] != null) || (right < work.length && work[right] != null);

    if (hasChild) {
      // Snapshot the two subtrees, then rebuild them mirrored in place.
      const before = work.slice();
      // Clear the whole subtree slots below i, then re-lay children mirrored.
      clearSubtree(work, left);
      clearSubtree(work, right);
      copySubtree(before, work, left, right); // old left subtree  → right slot
      copySubtree(before, work, right, left); // old right subtree → left slot
      swapped.push(i);
      emit(
        'SWAP',
        `swap under ${val}`,
        `Both subtrees of node ${val} are flipped, so now swap them: its old left subtree moves to the right and its old right subtree moves to the left. Node ${val}'s children are mirrored.`,
        i,
        false,
        'good',
      );
    } else {
      swapped.push(i);
      emit(
        'LEAF',
        `leaf ${val}`,
        `Node ${val} is a leaf — flip(nil), flip(nil) do nothing and there is nothing to swap. Return it unchanged.`,
        i,
        false,
      );
    }
  };

  flip(0);

  emit(
    'DONE',
    'tree flipped',
    'Every node has been visited and its children swapped, so the whole tree is now its mirror image. Time O(n) — one visit per node; Space O(h) — the recursion stack is as deep as the tree height.',
    null,
    true,
    'good',
  );

  return frames;
}

/** Null out slot `i` and every descendant of it in the level-order array. */
function clearSubtree(arr: (number | null)[], i: number) {
  if (i >= arr.length || arr[i] == null) return;
  clearSubtree(arr, 2 * i + 1);
  clearSubtree(arr, 2 * i + 2);
  arr[i] = null;
}

function View({ frame }: PluginViewProps<FlipTreeState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1'; // node being swapped now
    if (s.swapped.includes(i)) return 'team-2'; // children already swapped
    return 'team-0'; // untouched
  };
  const curVal = s.current !== null && s.current < s.tree.length ? s.tree[s.current] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        post-order swap · current ={' '}
        <span className="font-mono text-ink">{curVal ?? '—'}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        {s.done ? 'tree fully flipped' : `swapped ${s.swapped.length} node(s)`}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FlipTreeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null && s.current < s.tree.length ? s.tree[s.current] : null;
  const nodeCount = s.tree.filter((v) => v != null).length;
  return (
    <VarGrid>
      <InspectorRow k="current node" v={curVal ?? '—'} />
      <InspectorRow k="index" v={s.current ?? '—'} />
      <InspectorRow k="swapped" v={s.swapped.length} />
      <InspectorRow k="nodes" v={nodeCount} />
      <InspectorRow k="status" v={s.done ? 'flipped' : 'flipping…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-flip-tree';
export const title = 'Flip tree';

export const simulator: ProblemSimulator = {
  inputs: [
    // 1 / 2 3 / 4 5 6 7  →  1 / 3 2 / 7 6 5 4
    { id: 'ft1', label: '[1,2,3,4,5,6,7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
    // 4 / 2 7 / 1 3 6 9  (classic invert-binary-tree example)
    { id: 'ft2', label: '[4,2,7,1,3,6,9]', value: { tree: [4, 2, 7, 1, 3, 6, 9] } },
  ] satisfies SampleInput<FlipTreeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FlipTreeState | undefined;
    const t = s?.tree ?? [];
    const nodeCount = t.filter((v) => v != null).length;
    const label = `[${t.map((v) => (v == null ? '·' : v)).join(',')}]`;
    return { ok: nodeCount > 0, label };
  },
};
