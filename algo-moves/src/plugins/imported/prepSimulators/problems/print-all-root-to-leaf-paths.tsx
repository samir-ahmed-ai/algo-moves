import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface PathsInput {
  // Level-order array; null marks an absent child. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface PathsState {
  tree: (number | null)[];
  current: number | null; // index of node being visited (ring)
  visited: number[]; // indices already fully processed
  path: number[]; // node indices on the current root→node path
  out: number[][]; // collected root→leaf paths (as value arrays)
  done: boolean;
}

const LEFT = (i: number) => 2 * i + 1;
const RIGHT = (i: number) => 2 * i + 2;

function record({ tree }: PathsInput): Frame<PathsState>[] {
  const frames: Frame<PathsState>[] = [];
  const visited: number[] = [];
  const path: number[] = [];
  const out: number[][] = [];

  const exists = (i: number) => i >= 0 && i < tree.length && tree[i] !== null;
  const val = (i: number) => tree[i] as number;
  const pathVals = () => path.map((i) => val(i));

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
        tree,
        current,
        visited: visited.slice(),
        path: path.slice(),
        out: out.map((p) => p.slice()),
        done,
      },
    });

  emit(
    'INIT',
    'dfs(root)',
    'Print all root→leaf paths: DFS from the root, pushing each node value onto the running path. At every leaf we snapshot a copy of the path into the output. We always pop the node on the way back up so siblings start clean.',
    exists(0) ? 0 : null,
    false,
  );

  const dfs = (i: number) => {
    if (!exists(i)) return;

    path.push(i);
    emit(
      'PUSH',
      `push ${val(i)}`,
      `Enter node ${val(i)}: push it onto the path, which is now [${pathVals().join(', ')}].`,
      i,
      false,
    );

    const isLeaf = !exists(LEFT(i)) && !exists(RIGHT(i));
    if (isLeaf) {
      out.push(pathVals());
      emit(
        'LEAF',
        `path [${pathVals().join(', ')}]`,
        `Node ${val(i)} is a leaf (no children), so this root→leaf path is complete. Copy [${pathVals().join(', ')}] into the output.`,
        i,
        false,
        'good',
      );
    } else {
      if (exists(LEFT(i))) {
        emit(
          'GO_LEFT',
          `→ ${val(LEFT(i))}`,
          `Node ${val(i)} has a left child ${val(LEFT(i))}. Recurse left before right.`,
          i,
          false,
        );
        dfs(LEFT(i));
      }
      if (exists(RIGHT(i))) {
        emit(
          'GO_RIGHT',
          `→ ${val(RIGHT(i))}`,
          `Back at node ${val(i)}; now recurse into its right child ${val(RIGHT(i))}.`,
          i,
          false,
        );
        dfs(RIGHT(i));
      }
    }

    path.pop();
    visited.push(i);
    emit(
      'POP',
      `pop ${val(i)}`,
      `Done with node ${val(i)}'s subtree: pop it so the path becomes [${pathVals().join(', ')}] before we return to its parent.`,
      path.length > 0 ? path[path.length - 1] : i,
      false,
    );
  };

  dfs(0);

  emit(
    'DONE',
    `${out.length} paths`,
    `Traversal finished. We collected ${out.length} root→leaf path${out.length === 1 ? '' : 's'}: ${out
      .map((p) => `[${p.join('→')}]`)
      .join(', ')}.`,
    null,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PathsState>) {
  const s = frame.state;
  const onPath = new Set(s.path);
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.current === i || onPath.has(i)) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const pathVals = s.path.map((i) => (s.tree[i] as number));
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        path ={' '}
        <span className="font-mono text-ink">[{pathVals.join(', ')}]</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        out ={' '}
        {s.out.length === 0 ? '[]' : s.out.map((p) => `[${p.join('→')}]`).join('  ')}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.out.length} path{s.out.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PathsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.current !== null ? (s.tree[s.current] as number) : '—';
  const pathVals = s.path.map((i) => (s.tree[i] as number));
  return (
    <VarGrid>
      <InspectorRow k="current node" v={cur} />
      <InspectorRow k="depth" v={s.path.length} />
      <InspectorRow k="path" v={pathVals.length ? `[${pathVals.join(', ')}]` : '—'} />
      <InspectorRow k="paths found" v={s.out.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-print-all-root-to-leaf-paths';
export const title = 'Print all root to leaf paths';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rl1',
      label: '1(2(4,5),3(_,6))',
      value: { tree: [1, 2, 3, 4, 5, null, 6] },
    },
    {
      id: 'rl2',
      label: '1(2,3)',
      value: { tree: [1, 2, 3] },
    },
  ] satisfies SampleInput<PathsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PathsState | undefined;
    const n = s ? s.out.length : 0;
    return { ok: n > 0, label: `${n} path${n === 1 ? '' : 's'}` };
  },
};
