import { definePlugin, type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../core/types';
import { TreeBoard } from '../../components/TreeBoard';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases } from './cases';
import { quiz, codePieces } from './practice';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { VizStage, RailStack, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

type Order = 'preorder' | 'inorder' | 'postorder' | 'levelorder';

export interface TreeInput {
  tree: (number | null)[];
  order: Order;
}

export interface TreeState {
  tree: (number | null)[];
  order: Order;
  active: number | null;
  visited: number[];
  output: number[];
  frontier: number[]; // stack (DFS) or queue (BFS) of node indices
}

const present = (tree: (number | null)[], i: number) => i < tree.length && tree[i] != null;

function record({ tree, order }: TreeInput): Frame<TreeState>[] {
  const frames: Frame<TreeState>[] = [];
  const visited: number[] = [];
  const output: number[] = [];

  const emit = (type: string, note: string, caption: string, active: number | null, frontier: number[], tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { tree, order, active, visited: visited.slice(), output: output.slice(), frontier: frontier.slice() },
    });

  const val = (i: number) => tree[i];
  const intro: Record<Order, string> = {
    preorder: 'Pre-order DFS: visit the node first, then its left subtree, then its right.',
    inorder: 'In-order DFS: visit the left subtree, then the node, then the right — a BST yields sorted output.',
    postorder: 'Post-order DFS: visit both subtrees first, then the node — useful for deletes and bottom-up sums.',
    levelorder: 'Level-order BFS: visit nodes depth by depth using a queue.',
  };
  emit('INIT', order, intro[order], null, []);

  if (order === 'levelorder') {
    let q = [0];
    while (q.length) {
      const i = q[0];
      q = q.slice(1);
      visited.push(i);
      output.push(val(i) as number);
      emit('VISIT', `visit ${val(i)}`, `Dequeue and visit ${val(i)} (index ${i}). Append it to the output, then enqueue its children.`, i, q);
      for (const c of [2 * i + 1, 2 * i + 2]) if (present(tree, c)) q.push(c);
    }
  } else {
    const visit = (i: number, stack: number[]) => {
      if (order === 'preorder') {
        visited.push(i);
        output.push(val(i) as number);
        emit('VISIT', `visit ${val(i)}`, `Visit ${val(i)} before descending — append it to the output, then recurse left.`, i, stack);
      }
      if (present(tree, 2 * i + 1)) visit(2 * i + 1, [...stack, i]);
      if (order === 'inorder') {
        visited.push(i);
        output.push(val(i) as number);
        emit('VISIT', `visit ${val(i)}`, `Left subtree done, so visit ${val(i)} now — append it, then recurse right.`, i, stack);
      }
      if (present(tree, 2 * i + 2)) visit(2 * i + 2, [...stack, i]);
      if (order === 'postorder') {
        visited.push(i);
        output.push(val(i) as number);
        emit('VISIT', `visit ${val(i)}`, `Both subtrees of ${val(i)} are done, so visit it last and append it.`, i, stack);
      }
    };
    if (present(tree, 0)) visit(0, []);
  }

  emit('DONE', `[${output.join(',')}]`, `Traversal complete. ${order} = [${output.join(', ')}].`, null, [], 'good');
  return frames;
}

function View({ frame, onSelectNode, selectedNode }: PluginViewProps<TreeState>) {
  const s = frame.state;
  const vis = new Set(s.visited);
  const n = s.tree.filter((x) => x != null).length;
  const done = frame.move?.tone === 'good';
  const rail = (
    <>
      <RailStack
        label={s.order === 'levelorder' ? 'queue' : 'call stack'}
        items={s.frontier.map(String)}
        highlightEnd={s.order === 'levelorder' ? 'bottom' : undefined}
        topLabel={s.order === 'levelorder' ? 'front' : undefined}
      />
      <RailStack label="output" items={s.output.map(String)} />
      <RailGroup label="progress">
        <RailStat k="visited" v={`${s.output.length} / ${n}`} />
        <RailStat k="active" v={s.active !== null ? String(s.tree[s.active]) : '—'} tone="accent" />
      </RailGroup>
      {done && <RailResult label="result" value={`[${s.output.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard
        tree={s.tree}
        nodeClass={(i) => (s.active === i ? 'team-1' : vis.has(i) ? 'team-2' : 'team-0')}
        activeNode={s.active}
        highlightChild={s.active}
        pickedNode={selectedNode ?? null}
        onNodeClick={onSelectNode}
      />
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<TreeState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => {
        const n = s.tree.filter((x) => x != null).length;
        return (
          <>
            <InspectorRow k="order" v={s.order} />
            <InspectorRow k="visited" v={`${s.output.length} / ${n}`} />
            <InspectorRow k="output" v={s.output.length ? `[${s.output.join(', ')}]` : '∅'} />
            <InspectorRow k="active" v={s.active !== null ? `${s.tree[s.active]}` : '—'} />
          </>
        );
      }}
    />
  );
}

const goSolution = `package main
type Node struct{ Val int; Left, Right *Node }

func inorder(n *Node, out *[]int) {
	if n == nil {
		return
	}
	inorder(n.Left, out)
	*out = append(*out, n.Val)
	inorder(n.Right, out)
}

func levelOrder(root *Node) []int {
	out := []int{}
	if root == nil {
		return out
	}
	q := []*Node{root}
	for len(q) > 0 {
		n := q[0]
		q = q[1:]
		out = append(out, n.Val)
		if n.Left != nil {
			q = append(q, n.Left)
		}
		if n.Right != nil {
			q = append(q, n.Right)
		}
	}
	return out
}
`;

// A small, balanced BST: in-order yields 1..7 sorted.
const sampleTree: (number | null)[] = [4, 2, 6, 1, 3, 5, 7];

const inputs: SampleInput<TreeInput>[] = [
  { id: 'pre', label: 'Pre-order (node → L → R)', value: { tree: sampleTree, order: 'preorder' } },
  { id: 'in', label: 'In-order (L → node → R)', value: { tree: sampleTree, order: 'inorder' } },
  { id: 'post', label: 'Post-order (L → R → node)', value: { tree: sampleTree, order: 'postorder' } },
  { id: 'level', label: 'Level-order (BFS)', value: { tree: sampleTree, order: 'levelorder' } },
];

const verdict = (frames: Frame<TreeState>[]) => ({ ok: true, label: frames[0]?.state.order ?? 'traversal' });

const casesIntro =
  'The same balanced BST [4,2,6,1,3,5,7] visited four ways. The three DFS orders differ only in WHEN the node is emitted relative to its subtrees; level-order is BFS with a queue. Watch how the output sequence changes while the tree stays the same.';

const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  simulateSide: true,
  practice: {
    quiz,
    codePieces,
    cases: { good: goodCases, bad: badCases, intro: casesIntro, badLabel: 'when order misleads' },
    simulateQuestion: 'Which node is visited next?',
  },
});

export const treeTraversalsPlugin = definePlugin<TreeInput, TreeState>({
  meta: {
    id: 'tree-traversals',
    title: 'Tree traversals',
    difficulty: 'Easy',
    tags: ['tree', 'dfs', 'bfs'],
    summary: 'Pre/in/post-order DFS and level-order BFS on one binary tree, building the visit sequence step by step.',
    source: 'https://leetcode.com/problems/binary-tree-inorder-traversal/',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
});
