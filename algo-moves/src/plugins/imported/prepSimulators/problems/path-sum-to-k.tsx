import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PathSumInput {
  /** Level-order tree; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
  k: number;
}

interface PathSumState {
  tree: (number | null)[];
  k: number;
  node: number | null; // index of the node being processed (null = between/after DFS)
  visited: number[]; // node indices already entered (cnt[sum] added for these)
  sum: number | null; // running root-to-node prefix sum at this node
  need: number | null; // sum - k, the ancestor prefix we look up
  hits: number; // how many matching prefixes cnt[need] contributed this step
  cnt: [number, number][]; // prefix-sum -> occurrences on the current path
  ans: number;
  done: boolean;
}

function record({ tree, k }: PathSumInput): Frame<PathSumState>[] {
  const frames: Frame<PathSumState>[] = [];
  const cnt = new Map<number, number>([[0, 1]]);
  const visited: number[] = [];
  let ans = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<PathSumState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        k,
        node: null,
        visited: [...visited],
        sum: null,
        need: null,
        hits: 0,
        cnt: [...cnt.entries()],
        ans,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Path sum to K: count downward root-to-descendant paths whose values sum to ${k}. We DFS once, tracking the running root-to-node prefix sum. cnt holds how many ancestor prefixes we have seen, seeded with cnt[0] = 1 for the empty prefix.`,
    {},
  );

  const dfs = (i: number, parentSum: number) => {
    if (i >= tree.length || tree[i] == null) return;
    const val = tree[i]!;
    const sum = parentSum + val;
    const need = sum - k;
    const hits = cnt.get(need) ?? 0;

    emit(
      'LOOKUP',
      `sum=${sum}, need=${need}`,
      `Enter node ${val}. Running prefix sum from the root is ${sum}. A path ending here sums to ${k} whenever some ancestor prefix equals sum − k = ${sum} − ${k} = ${need}. cnt has ${hits} such prefix${hits === 1 ? '' : 'es'}, so add ${hits} to the answer (${ans} → ${ans + hits}).`,
      { node: i, sum, need, hits },
      hits > 0 ? 'good' : undefined,
    );

    ans += hits;
    cnt.set(sum, (cnt.get(sum) ?? 0) + 1);
    visited.push(i);

    emit(
      'RECORD',
      `cnt[${sum}]++`,
      `Record this node's prefix sum: cnt[${sum}] is now ${cnt.get(sum)}. Then recurse into its children so deeper nodes can look back at this prefix.`,
      { node: i, sum, need: null, hits: 0 },
    );

    dfs(2 * i + 1, sum);
    dfs(2 * i + 2, sum);

    cnt.set(sum, (cnt.get(sum) ?? 0) - 1);
    if (cnt.get(sum) === 0) cnt.delete(sum);
    const vi = visited.indexOf(i);
    if (vi !== -1) visited.splice(vi, 1);

    emit(
      'UNDO',
      `cnt[${sum}]--`,
      `Both subtrees of node ${val} are done. Backtrack: remove this node's prefix (cnt[${sum}]--) so it can't be seen by unrelated branches. cnt[${sum}] is now ${cnt.get(sum) ?? 0}.`,
      { node: i, sum },
    );
  };

  dfs(0, 0);

  emit(
    'DONE',
    `${ans} paths`,
    `DFS complete. ${ans} downward path${ans === 1 ? '' : 's'} sum to ${k}.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PathSumState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.node === i && !s.done) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {s.sum !== null && !s.done && (
          <>
            {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
            {s.need !== null && (
              <>
                {' · '}need = <span className="font-mono text-ink">{s.need}</span>
              </>
            )}
          </>
        )}
        {' · '}ans = <span className="font-mono text-ink">{s.ans}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.done ? null : s.node} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        cnt {'{'}
        {s.cnt
          .slice()
          .sort((a, b) => a[0] - b[0])
          .map(([v, c]) => `${v}:${c}`)
          .join(', ')}
        {'}'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PathSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const val = s.node !== null ? s.tree[s.node] : null;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="node value" v={val ?? '—'} />
      <InspectorRow k="sum (prefix)" v={s.sum ?? '—'} />
      <InspectorRow k="need (sum−k)" v={s.need ?? '—'} />
      <InspectorRow k="cnt[need]" v={s.need !== null ? s.hits : '—'} />
      <InspectorRow k="ans" v={s.done ? `${s.ans} paths` : s.ans} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-path-sum-to-k';
export const title = 'Path sum to K';

export const simulator: ProblemSimulator = {
  inputs: [
    // Tree:  10 / (5, -3) ; 5 / (3, 2) ; -3 / (_, 11). Two downward
    // paths sum to 8: (10, -3, ... ) no — the two are 5→3 and (10, -3, ...)? The
    // actual matches are 5+3 = 8 and -3+11 = 8, so the answer is 2.
    { id: 'ps1', label: 'k = 8', value: { tree: [10, 5, -3, 3, 2, null, 11], k: 8 } },
    // Tree: 7 / (4, 2) ; 4 / (3, _) ; 2 / (5, _). Three paths sum to 7:
    // 7 (root alone), 4+3, and 2+5 → answer 3.
    { id: 'ps2', label: 'k = 7', value: { tree: [7, 4, 2, 3, null, 5, null], k: 7 } },
  ] satisfies SampleInput<PathSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PathSumState | undefined;
    const n = s?.ans ?? 0;
    return { ok: true, label: `${n} path${n === 1 ? '' : 's'}` };
  },
};
