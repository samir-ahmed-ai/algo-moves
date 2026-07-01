import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';

interface DoublyInput {
  /** Level-order tree; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

type NodeStatus = 'idle' | 'active' | 'done';

interface DoublyState {
  tree: (number | null)[];
  status: NodeStatus[]; // per level-order index
  active: number | null; // index currently being visited (ring)
  prev: number | null; // previous linked node (tree index)
  list: number[]; // values of the doubly-linked list built so far (in order)
  head: number | null; // value of the list head, once known
  done: boolean;
}

function record({ tree }: DoublyInput): Frame<DoublyState>[] {
  const frames: Frame<DoublyState>[] = [];
  const status: NodeStatus[] = tree.map(() => 'idle');
  const list: number[] = [];

  let prevIdx: number | null = null;
  let headVal: number | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        status: status.slice(),
        active,
        prev: prevIdx,
        list: list.slice(),
        head: headVal,
        done,
      },
    });

  emit(
    'INIT',
    'inorder',
    `Convert a BST to a sorted doubly-linked list in place. An inorder walk (left → node → right) visits nodes in ascending order, and we stitch each visited node onto the tail of the list as we go.`,
    null,
    false,
  );

  const dfs = (i: number) => {
    if (i >= tree.length || tree[i] == null) return;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    const val = tree[i] as number;

    if (left < tree.length && tree[left] != null) {
      emit(
        'GO_LEFT',
        `↙ ${val}`,
        `At node ${val}: recurse left first so every smaller value is linked before ${val} itself.`,
        i,
        false,
      );
    }
    dfs(left);

    // Visit this node.
    status[i] = 'active';
    if (headVal === null) {
      headVal = val;
      emit(
        'HEAD',
        `head=${val}`,
        `${val} is the leftmost (smallest) node, so it becomes the head of the doubly-linked list. There is no previous node to link back to yet.`,
        i,
        false,
      );
    } else {
      const prevVal = tree[prevIdx as number] as number;
      emit(
        'LINK',
        `${prevVal}↔${val}`,
        `Link ${prevVal} and ${val}: set prev.Next = ${val} and ${val}.Prev = ${prevVal}. This appends ${val} to the tail of the list.`,
        i,
        false,
      );
    }
    list.push(val);
    prevIdx = i;
    status[i] = 'done';
    emit(
      'ADVANCE',
      `prev=${val}`,
      `${val} is now the tail. Set prev = ${val}, then recurse right to attach any larger values after it.`,
      i,
      false,
    );

    dfs(right);
  };

  dfs(0);

  const headLabel = headVal === null ? '(empty)' : String(headVal);
  emit(
    'DONE',
    `head=${headLabel}`,
    `Inorder walk complete. The nodes are now a sorted doubly-linked list: ${list.length ? list.join(' ↔ ') : '(empty)'}. The head is ${headLabel}. Time O(n), space O(h) for the recursion stack.`,
    null,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DoublyState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (s.status[i] === 'done') return 'team-2';
    return 'team-0';
  };
  const prevVal = s.prev !== null ? (s.tree[s.prev] as number) : '—';
  const rail = (
    <>
      <RailGroup label="pointers">
        <RailStat k="head" v={s.head ?? '—'} tone="accent" />
        <RailStat k="prev" v={prevVal} />
      </RailGroup>
      <RailStack label="list" items={s.list.map(String)} highlightEnd="bottom" topLabel="head" />
      {s.done && (
        <RailResult label="result" value={s.list.length ? s.list.join('↔') : '∅'} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DoublyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.active !== null ? (s.tree[s.active] as number) : '—';
  const prevVal = s.prev !== null ? (s.tree[s.prev] as number) : '—';
  return (
    <VarGrid>
      <InspectorRow k="cur (visiting)" v={cur} />
      <InspectorRow k="prev (tail)" v={prevVal} />
      <InspectorRow k="head" v={s.head ?? '—'} />
      <InspectorRow k="linked" v={s.list.length} />
      <InspectorRow k="list" v={s.list.length ? s.list.join('↔') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-convert-binary-tree-to-doubly';
export const title = 'Convert binary tree to doubly';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'cd1', label: 'BST [4,2,5,1,3]', value: { tree: [4, 2, 5, 1, 3] } },
    {
      id: 'cd2',
      label: 'BST [5,3,8,2,4,null,9]',
      value: { tree: [5, 3, 8, 2, 4, null, 9] },
    },
  ] satisfies SampleInput<DoublyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DoublyState | undefined;
    if (!s || s.list.length === 0) return { ok: false, label: 'empty' };
    return { ok: true, label: s.list.join(' ↔ ') };
  },
};
