import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

/**
 * N-ary tree diameter. The board uses TreeBoard's binary level-order layout
 * (children of i are 2i+1 and 2i+2), so we author the sample trees so every
 * node has at most two children — that keeps the level-order array a faithful
 * picture of the actual N-ary tree while still exercising the top-2-heights idea.
 *
 * Faithful to the Go solution:
 *   getHeight(nil) = -1; getHeight(node) = 1 + max child height.
 *   getDiameter(node): find top-1 and top-2 child heights; the path THROUGH the
 *   node is top1 + top2 + 2 (both present) or top1 + 1 (one child). The answer is
 *   the max of that "through" value and every child's own diameter.
 */

// Level-order tree: value at each slot, null for an absent slot. Children of i
// live at 2i+1 and 2i+2. `null` gaps let us omit a left child while keeping a
// right one, matching TreeBoard's addressing.
type TreeInput = { tree: (number | null)[] };

interface DiaState {
  tree: (number | null)[];
  active: number | null; // node currently being processed (team-1 ring)
  done: number[]; // node indices already resolved (team-2)
  heights: [number, number][]; // computed getHeight results: [index, height]
  top1: number | null; // best child height at the active node
  top2: number | null; // second-best child height at the active node
  through: number | null; // path length through the active node
  best: number; // running global answer
  finished: boolean;
}

// ---- Faithful re-implementation of the Go solution, instrumented to emit frames.
function record({ tree }: TreeInput): Frame<DiaState>[] {
  const frames: Frame<DiaState>[] = [];
  const n = tree.length;
  const kids = (i: number) => [2 * i + 1, 2 * i + 2].filter((c) => c < n && tree[c] != null);

  const heights = new Map<number, number>(); // index -> getHeight(index)
  const done: number[] = [];
  let best = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<DiaState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        active: null,
        done: [...done],
        heights: [...heights.entries()],
        top1: null,
        top2: null,
        through: null,
        best,
        finished: false,
        ...s,
      },
    });

  // getHeight(i): -1 for a null slot, else 1 + max child height. Memoized so the
  // View can show every resolved height; results match the Go getHeight exactly.
  const getHeight = (i: number): number => {
    if (i >= n || tree[i] == null) return -1;
    if (heights.has(i)) return heights.get(i)!;
    let maxChild = -1;
    for (const c of kids(i)) {
      const h = getHeight(c);
      if (h > maxChild) maxChild = h;
    }
    const h = maxChild + 1;
    heights.set(i, h);
    return h;
  };

  // getDiameter mirrors the Go post-order walk, emitting a frame per node.
  const getDiameter = (i: number): number => {
    if (i >= n || tree[i] == null) return 0;

    emit(
      'VISIT',
      `node ${tree[i]}`,
      `Recurse into node ${tree[i]}. We will (1) find its two tallest child subtrees and (2) compare the path through it against each child's own diameter.`,
      { active: i },
    );

    let max1 = -1;
    let max2 = -1;
    for (const c of kids(i)) {
      const h = getHeight(c);
      if (h > max1) {
        max2 = max1;
        max1 = h;
      } else if (h > max2) {
        max2 = h;
      }
      emit(
        'HEIGHT',
        `h(${tree[c]})=${h}`,
        `Child ${tree[c]} has height ${h}. Track the two tallest child heights so far: top1=${max1}${max2 >= 0 ? `, top2=${max2}` : ''}.`,
        { active: i, top1: max1 >= 0 ? max1 : null, top2: max2 >= 0 ? max2 : null },
      );
    }

    let through = 0;
    if (max1 >= 0 && max2 >= 0) through = max1 + max2 + 2;
    else if (max1 >= 0) through = max1 + 1;

    const throughNote =
      max1 >= 0 && max2 >= 0
        ? `top1(${max1}) + top2(${max2}) + 2 = ${through}`
        : max1 >= 0
          ? `top1(${max1}) + 1 = ${through}`
          : `no children → 0`;
    let diameter = through;
    if (through > best) best = through;
    emit(
      'THROUGH',
      throughNote,
      `Path THROUGH node ${tree[i]} = ${throughNote}. This joins its two deepest branches. Global best is now ${best}.`,
      { active: i, top1: max1 >= 0 ? max1 : null, top2: max2 >= 0 ? max2 : null, through },
    );

    for (const c of kids(i)) {
      const d = getDiameter(c);
      if (d > diameter) diameter = d;
      if (diameter > best) best = diameter;
    }

    done.push(i);
    emit(
      'RESOLVE',
      `dia(${tree[i]})=${diameter}`,
      `Node ${tree[i]} is resolved: its diameter is max(through=${through}, best child diameter) = ${diameter}. Bubble it up to the parent.`,
      { active: i, through, best },
    );
    return diameter;
  };

  emit(
    'INIT',
    `n=${tree.filter((v) => v != null).length}`,
    `N-ary tree diameter: the longest path between any two nodes. At each node the candidate is its two tallest child heights + 2; we also carry up each child's own diameter and keep the global max. Time O(n), Space O(h).`,
    {},
  );

  const answer = getDiameter(0);
  best = Math.max(best, answer);

  emit(
    'DONE',
    `diameter=${answer}`,
    `Every node has been resolved. The overall diameter of the tree is ${answer} edges.`,
    { finished: true, best: answer, through: answer },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DiaState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (s.done.includes(i)) return 'team-2';
    return 'team-0';
  };
  const heightMap = new Map(s.heights);
  const activeVal = s.active !== null ? s.tree[s.active] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best diameter ={' '}
        <span className={cn('font-mono', s.finished ? 'text-good' : 'text-ink')}>{s.best}</span>
        {activeVal != null && !s.finished && (
          <>
            {' · '}at node <span className="font-mono text-ink">{activeVal}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 flex flex-wrap gap-x-2 font-mono', vizText.xs, 'text-ink3')}>
        {s.top1 !== null && <span>top1 = {s.top1}</span>}
        {s.top2 !== null && <span>top2 = {s.top2}</span>}
        {s.through !== null && <span>through = {s.through}</span>}
        {heightMap.size > 0 && (
          <span>
            heights {'{'}
            {[...heightMap.entries()].map(([i, h]) => `${s.tree[i]}:${h}`).join(', ')}
            {'}'}
          </span>
        )}
      </div>
      {s.finished && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ diameter = {s.best}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DiaState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeVal = s.active !== null ? s.tree[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="active node" v={activeVal ?? '—'} />
      <InspectorRow k="top1 (tallest child)" v={s.top1 ?? '—'} />
      <InspectorRow k="top2 (2nd tallest)" v={s.top2 ?? '—'} />
      <InspectorRow k="through node" v={s.through ?? '—'} />
      <InspectorRow k="resolved nodes" v={s.done.length} />
      <InspectorRow k="best diameter" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-diameter';
export const title = 'Get diameter';

export const simulator: ProblemSimulator = {
  inputs: [
    // Level-order (binary slots): root 1 has children 2 and 3; 2 has child 4;
    // 4 has child 6; 3 has child 5. The through-root path is 1's two branches.
    {
      id: 'nd1',
      label: 'balanced-ish tree',
      value: { tree: [1, 2, 3, 4, null, 5, null, 6] },
    },
    // A left-leaning chain: 1→2→3→4. Diameter is the single deep branch.
    {
      id: 'nd2',
      label: 'left chain',
      value: { tree: [1, 2, null, 3, null, null, null, 4] },
    },
  ] satisfies SampleInput<TreeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DiaState | undefined;
    const v = s?.best ?? 0;
    return { ok: true, label: `diameter = ${v}` };
  },
};
