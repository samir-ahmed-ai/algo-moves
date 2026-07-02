import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Level-order tree: children of i live at 2i+1 and 2i+2; null marks an absent slot.
interface DiameterInput {
  tree: (number | null)[];
}

interface DiameterState {
  tree: (number | null)[];
  active: number | null; // node currently being processed (ring)
  visited: number[]; // node indices whose height has been returned
  l: number | null; // left subtree height at the active node
  r: number | null; // right subtree height at the active node
  best: number; // best diameter (edge count) seen so far
  height: number | null; // height this node returns (1 + max(l, r))
  bestNode: number | null; // node the current best path bends through
  done: boolean;
}

function record({ tree }: DiameterInput): Frame<DiameterState>[] {  const visited: number[] = [];
  let best = 0;
  let bestNode: number | null = null;

  const has = (i: number) => i >= 0 && i < tree.length && tree[i] != null;

  const { emit, frames } = createRecorder<DiameterState>(() => ({
        tree,
        active: null,
        visited: visited.slice(),
        l: null,
        r: null,
        best,
        height: null,
        bestNode,
        done: false
      }));

  emit(
    'INIT',
    'best=0',
    `Diameter = the longest path (counted in edges) between any two nodes. Any such path bends at exactly one node, where it uses that node's left height + right height. We post-order DFS: compute each subtree's height, and at every node update best = max(best, L + R).`,
    {},
  );

  const height = (i: number): number => {
    if (!has(i)) return 0; // null child contributes height 0

    emit(
      'ENTER',
      `node ${tree[i]}`,
      `Visit node ${tree[i]}. Before we can measure the path bending here, recurse into its children to get their heights (post-order — children first).`,
      { active: i },
    );

    const l = height(2 * i + 1);
    const r = height(2 * i + 2);

    const through = l + r;
    const improved = through > best;
    if (improved) {
      best = through;
      bestNode = i;
    }
    emit(
      improved ? 'BEST' : 'COMBINE',
      `L+R=${through}`,
      `At node ${tree[i]}: left height L = ${l}, right height R = ${r}. A path bending here spans L + R = ${through} edges. ${
        improved
          ? `That beats the old best, so best = ${best}.`
          : `That is not more than the current best ${best}, so best stays ${best}.`
      }`,
      { active: i, l, r, best, bestNode },
      improved ? 'good' : undefined,
    );

    const h = Math.max(l, r) + 1;
    visited.push(i);
    emit(
      'RETURN',
      `h=${h}`,
      `Node ${tree[i]} returns its own height to its parent: 1 + max(L, R) = 1 + max(${l}, ${r}) = ${h}. This is how tall the subtree rooted at ${tree[i]} is.`,
      { active: i, l, r, best, height: h, bestNode },
    );
    return h;
  };

  height(0);

  emit(
    'DONE',
    `diameter=${best}`,
    `Every node has been processed. The diameter is the largest L + R found: ${best} edge${best === 1 ? '' : 's'}${
      bestNode !== null ? `, bending through node ${tree[bestNode]}` : ''
    }.`,
    { done: true, best, bestNode },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DiameterState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1'; // current node
    if (visitedSet.has(i)) return 'team-2'; // height returned
    return 'team-0'; // not yet processed
  };
  const bestLabel = s.done ? `${s.best}` : `${s.best}…`;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best diameter = <span className="font-mono text-ink">{bestLabel}</span>
        {s.active !== null && s.l !== null && s.r !== null && (
          <>
            {' · '}here L+R ={' '}
            <span className="font-mono text-ink">{s.l + s.r}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.active !== null
          ? `L=${s.l ?? '?'} R=${s.r ?? '?'}${s.height !== null ? ` → h=${s.height}` : ''}`
          : 'path = edges on the longest node-to-node route'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DiameterState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const label = (i: number | null) => (i !== null && s.tree[i] != null ? s.tree[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="node" v={label(s.active)} />
      <InspectorRow k="L (left height)" v={s.l ?? '—'} />
      <InspectorRow k="R (right height)" v={s.r ?? '—'} />
      <InspectorRow k="L + R (path here)" v={s.l !== null && s.r !== null ? s.l + s.r : '—'} />
      <InspectorRow k="returns h" v={s.height ?? '—'} />
      <InspectorRow k="best diameter" v={s.best} />
      <InspectorRow k="bends through" v={label(s.bestNode)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-get-diameter';
export const title = 'Get diameter';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'gd1', label: '[1,2,3,4,5]', value: { tree: [1, 2, 3, 4, 5] } },
    { id: 'gd2', label: 'chain [1,2,·,3]', value: { tree: [1, 2, null, 3] } },
  ] satisfies SampleInput<DiameterInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DiameterState | undefined;
    const d = s?.best ?? 0;
    return { ok: true, label: `diameter ${d}` };
  },
};
