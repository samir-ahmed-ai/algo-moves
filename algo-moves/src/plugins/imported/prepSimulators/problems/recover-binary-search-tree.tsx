import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface RecoverInput {
  /** Level-order values; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface RecoverState {
  tree: (number | null)[]; // current values (mutated on the final swap)
  visited: number[]; // node indices already assigned into the sorted order
  cur: number | null; // node index being visited right now
  prev: number | null; // previous in-order node index
  first: number | null; // first inversion node (higher, misplaced value)
  second: number | null; // second inversion node (lower, misplaced value)
  swapped: boolean; // the two values have been exchanged
  done: boolean;
}

function record({ tree }: RecoverInput): Frame<RecoverState>[] {
  const values = tree.slice();
  const n = values.length;
  const frames: Frame<RecoverState>[] = [];

  // Mutable traversal bookkeeping mirroring the Go closure vars.
  let first: number | null = null;
  let second: number | null = null;
  let prev: number | null = null;
  const visited: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<RecoverState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree: values.slice(),
        visited: visited.slice(),
        cur: null,
        prev,
        first,
        second,
        swapped: false,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    'inorder walk',
    'Recover BST: exactly two node values were swapped. An in-order walk of a valid BST yields sorted values, so the swap shows up as one or two "inversions" where prev.val > node.val. Time O(n), space O(h).',
    {},
  );

  const inorder = (i: number) => {
    if (i >= n || values[i] == null) return;
    inorder(2 * i + 1);

    emit(
      'VISIT',
      `node ${values[i]}`,
      prev === null
        ? `Visit node ${values[i]} in in-order position. It is the first value seen, so there is nothing before it to compare against yet.`
        : `Visit node ${values[i]}. Compare it with the previous in-order value ${values[prev]}: a sorted BST needs ${values[prev]} < ${values[i]}.`,
      { cur: i },
    );

    if (prev !== null && (values[prev] as number) > (values[i] as number)) {
      if (first === null) {
        first = prev;
        second = i;
        emit(
          'INVERSION',
          `${values[prev]} > ${values[i]}`,
          `Inversion found: ${values[prev]} > ${values[i]} breaks the sorted order. Flag prev (${values[prev]}) as the first misplaced node and, for now, node (${values[i]}) as the second.`,
          { cur: i, first, second },
          'bad',
        );
      } else {
        second = i;
        emit(
          'INVERSION',
          `${values[prev]} > ${values[i]}`,
          `Second inversion: ${values[prev]} > ${values[i]}. The swapped nodes were not adjacent in-order, so update second to this node (${values[i]}). Keep first as it was.`,
          { cur: i, first, second },
          'bad',
        );
      }
    }

    visited.push(i);
    prev = i;
    inorder(2 * i + 2);
  };

  inorder(0);

  if (first !== null && second !== null) {
    emit(
      'IDENTIFY',
      `swap ${values[first]}↔${values[second]}`,
      `Walk complete. The two misplaced nodes hold ${values[first]} and ${values[second]}. Exchanging their values restores the BST.`,
      { cur: null, first, second },
    );
    const tmp = values[first];
    values[first] = values[second];
    values[second] = tmp;
    emit(
      'SWAP',
      'BST recovered',
      `Swapped the values: node that held ${values[second]} now holds ${values[first]}, and vice versa. The tree is a valid BST again.`,
      { cur: null, first, second, swapped: true, done: true },
      'good',
    );
  } else {
    emit(
      'DONE',
      'already valid',
      'No inversion found — the in-order sequence is already sorted, so the tree is a valid BST and nothing needs to change.',
      { done: true },
      'good',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<RecoverState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.first === i || s.second === i) return 'team-1';
    if (s.cur === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const flagged = [s.first, s.second].filter((x): x is number => x !== null);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        in-order so far:{' '}
        <span className="font-mono text-ink">
          {s.visited.length ? s.visited.map((i) => s.tree[i]).join(' ') : '·'}
        </span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.cur} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {flagged.length === 2 ? (
          <span className={s.swapped ? 'text-good' : 'text-bad'}>
            {s.swapped ? '✓ swapped ' : 'swap '}
            {s.tree[flagged[0]]} ↔ {s.tree[flagged[1]]}
          </span>
        ) : (
          'no inversion yet'
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RecoverState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const val = (i: number | null) => (i !== null && s.tree[i] != null ? s.tree[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="cur (node)" v={val(s.cur)} />
      <InspectorRow k="prev" v={val(s.prev)} />
      <InspectorRow k="first (misplaced)" v={val(s.first)} />
      <InspectorRow k="second (misplaced)" v={val(s.second)} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="status" v={s.swapped ? 'recovered' : s.done ? 'valid' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-recover-binary-search-tree';
export const title = 'Recover Binary Search Tree';

export const simulator: ProblemSimulator = {
  inputs: [
    // BST [1,2,3] with 1 and 3 swapped -> stored as [3,1,2]; recover to [2,1,3].
    { id: 'rbst1', label: '[3,1,2] (1 & 3 swapped)', value: { tree: [3, 1, 2] } },
    // Non-adjacent swap: valid BST 1,2,3,4 laid out as [3,1,4,null,2]; nodes 2 and 3 swapped -> [2,1,4,null,3].
    { id: 'rbst2', label: '[2,1,4,null,3] (2 & 3 swapped)', value: { tree: [2, 1, 4, null, 3] } },
  ] satisfies SampleInput<RecoverInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RecoverState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    // Confirm the recovered tree is a valid BST via in-order sortedness.
    const n = s.tree.length;
    const order: number[] = [];
    const walk = (i: number) => {
      if (i >= n || s.tree[i] == null) return;
      walk(2 * i + 1);
      order.push(s.tree[i] as number);
      walk(2 * i + 2);
    };
    walk(0);
    const sorted = order.every((v, k) => k === 0 || order[k - 1] < v);
    return sorted ? { ok: true, label: `sorted: ${order.join(' ')}` } : { ok: false, label: 'still invalid' };
  },
};
