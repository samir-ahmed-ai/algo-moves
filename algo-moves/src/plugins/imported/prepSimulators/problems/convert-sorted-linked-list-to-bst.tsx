import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface ListToBstInput {
  /** Sorted (ascending) values of the linked list, head → tail. */
  list: number[];
}

type Status = 'idle' | 'active' | 'done';

interface ListToBstState {
  list: number[]; // the sorted list values, head → tail
  cur: number | null; // index into `list` of the current head cursor
  tree: (number | null)[]; // level-order BST built so far (null = empty slot)
  status: Status[]; // per tree-slot visit status
  active: number | null; // tree slot currently being processed
  built: number[]; // list values consumed as roots so far (in-order)
  done: boolean;
}

function record({ list }: ListToBstInput): Frame<ListToBstState>[] {  const n = list.length;

  // Map each build(l, r) call to a stable level-order tree slot so the whole
  // tree is laid out consistently as nodes get filled in. Root = slot 0,
  // children of slot i live at 2i+1 (left) and 2i+2 (right).
  const capacity = n === 0 ? 1 : Math.pow(2, Math.ceil(Math.log2(n + 1)) + 1);
  const tree: (number | null)[] = new Array<number | null>(capacity).fill(null);
  const status: Status[] = new Array<Status>(capacity).fill('idle');
  const built: number[] = [];

  let cur = 0;

  const { emit, frames } = createRecorder<ListToBstState>(() => ({
        list,
        cur: cur < n ? cur : null,
        tree: tree.slice(),
        status: status.slice(),
        active: null,
        built: built.slice(),
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Convert an ascending sorted linked list into a height-balanced BST. First count the ${n} nodes, then build the tree by an in-order recursion: for each range pick the middle as a node, build its left subtree first, consume the current list head as this node's value, then build the right subtree. Because we build in-order and the list is sorted, the head cursor always lines up with the next value to place. Time O(n), Space O(n).`,
    {},
  );

  if (n === 0) {
    emit('DONE', 'empty', 'The list is empty, so the BST is empty — return null.', { done: true }, 'bad');
    return frames;
  }

  // Recursive builder mirroring the Go solution. `slot` is the level-order tree
  // index assigned to this build(l, r) call.
  const build = (l: number, r: number, slot: number): void => {
    if (l > r) return;
    const m = (l + r) >> 1;
    const left = 2 * slot + 1;
    const right = 2 * slot + 2;

    emit(
      'RANGE',
      `[${l},${r}] m=${m}`,
      `Enter build(${l}, ${r}). The middle index is m = (${l} + ${r}) / 2 = ${m}; that middle element will become the root of this subtree. But first we must build its left subtree so the head cursor advances to the middle value.`,
      { active: slot, status: status.slice() },
    );

    // Build LEFT first — this drains the smaller values from the list head.
    if (l <= m - 1) {
      emit(
        'GO_LEFT',
        `build(${l},${m - 1})`,
        `Recurse into the left half build(${l}, ${m - 1}) before touching this node. Its values are all smaller, so they must be consumed from the list first.`,
        { active: slot, status: status.slice() },
      );
    }
    build(l, m - 1, left);

    // Take the CURRENT list head as this node's value, then advance the cursor.
    const nodeVal = list[cur];
    tree[slot] = nodeVal;
    status[slot] = 'active';
    built.push(nodeVal);
    emit(
      'TAKE',
      `root=${nodeVal}`,
      `The left subtree is done, so the head cursor now points at ${nodeVal} — exactly the middle value for range [${l}, ${r}]. Make ${nodeVal} the root of this subtree and attach the left subtree we just built.`,
      { active: slot },
    );
    cur++;
    emit(
      'ADVANCE',
      `cur→${cur < n ? list[cur] : 'end'}`,
      `Advance the head cursor past ${nodeVal}. It now points at ${cur < n ? list[cur] : 'the end of the list'}, ready to feed the right subtree.`,
      { active: slot },
    );

    // Build RIGHT — the remaining larger values.
    if (m + 1 <= r) {
      emit(
        'GO_RIGHT',
        `build(${m + 1},${r})`,
        `Recurse into the right half build(${m + 1}, ${r}) to attach the larger values as ${nodeVal}'s right subtree.`,
        { active: slot },
      );
    }
    build(m + 1, r, right);

    status[slot] = 'done';
    emit(
      'RETURN',
      `done ${nodeVal}`,
      `Both subtrees of ${nodeVal} are attached, so this subtree is complete. Return ${nodeVal} to its parent.`,
      { active: slot },
    );
  };

  build(0, n - 1, 0);

  emit(
    'DONE',
    `root=${tree[0]}`,
    `The whole list has been consumed in order and the balanced BST is built. Its in-order traversal is exactly the original sorted list ${list.join(', ')}. Return the root ${tree[0]}.`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ListToBstState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    const st = s.status[i] ?? 'idle';
    if (st === 'active') return 'team-1';
    if (st === 'done') return 'team-2';
    return 'team-0';
  };
  const listCells = s.list.map((v, i) => {
    if (s.cur === i) return `▸${v}`;
    return String(v);
  });
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sorted list:{' '}
        <span className="font-mono text-ink">{listCells.length ? listCells.join('  ') : '·'}</span>
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>
        head cursor →{' '}
        <span className="font-mono text-ink">{s.cur !== null ? s.list[s.cur] : 'end'}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        in-order taken: {s.built.length ? s.built.join(', ') : '·'}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>current subtree ringed; roots taken in sorted order</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ListToBstState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="list length" v={s.list.length} />
      <InspectorRow k="head cursor" v={s.cur !== null ? s.list[s.cur] : 'end'} />
      <InspectorRow k="roots taken" v={s.built.length} />
      <InspectorRow k="active subtree" v={s.active !== null && s.tree[s.active] != null ? s.tree[s.active] : '—'} />
      <InspectorRow k="root" v={s.tree[0] != null ? s.tree[0] : '…'} />
      <InspectorRow k="in-order" v={s.built.length ? s.built.join(',') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-convert-sorted-linked-list-to-bst';
export const title = 'Convert sorted linked list to BST';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'cll1', label: '[1,2,3,4,5,6,7]', value: { list: [1, 2, 3, 4, 5, 6, 7] } },
    { id: 'cll2', label: '[-10,-3,0,5,9]', value: { list: [-10, -3, 0, 5, 9] } },
  ] satisfies SampleInput<ListToBstInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ListToBstState | undefined;
    if (!s || s.list.length === 0) return { ok: false, label: 'empty' };
    // The BST is correct iff its in-order traversal equals the original sorted list.
    const ok = s.built.length === s.list.length && s.built.every((v, i) => v === s.list[i]);
    return { ok, label: `root=${s.tree[0]}` };
  },
};
