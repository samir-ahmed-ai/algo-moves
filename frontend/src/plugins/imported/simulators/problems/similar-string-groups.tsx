import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface SSGInput {
  /** Short equal-length strings; two are "similar" when they differ in 0 or 2 positions. */
  strs: string[];
  pos: [number, number][];
}

interface SSGState {
  parent: number[];
  size: number[];
  strs: string[];
  /** Union edges drawn so far (string-index pairs). */
  adj: number[][];
  pos: [number, number][];
  /** Pair currently being compared (indices) or null. */
  pair: [number, number] | null;
  /** Differing-position count for the current comparison, or null. */
  diffs: number | null;
  /** Whether the current comparison unioned the pair. */
  united: boolean;
  groups: number;
  done: boolean;
}

/** Count differing positions, short-circuiting once it exceeds 2 (mirrors the Go solution). */
function countDiffs(a: string, b: string): number {
  let diffs = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] !== b[k]) {
      diffs++;
      if (diffs > 2) break;
    }
  }
  return diffs;
}

function record({ strs, pos }: SSGInput): Frame<SSGState>[] {
  const n = strs.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = new Array<number>(n).fill(1);
  const adj: number[][] = Array.from({ length: n }, () => []);
  let groups = n;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const { emit, frames } = createRecorder<SSGState>(() => ({
        parent: parent.slice(),
        size: size.slice(),
        strs: strs,
        adj: adj.map((row) => row.slice()),
        pos: pos,
        groups: groups,
        pair: null,
        diffs: null,
        united: false,
        done: false
      }));
  // renamed from snapshot

  emit('INIT', `${n} strings`, `Similar String Groups: each of the ${n} strings starts in its own group. Two strings are "similar" when they differ in exactly 0 or 2 positions; we compare every pair and union the similar ones. The answer is the final number of groups.`, { pair: null, diffs: null, united: false });

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const diffs = countDiffs(strs[i], strs[j]);
      const similar = diffs === 0 || diffs === 2;
      if (!similar) {
        // Skip non-similar pairs silently to keep the animation focused on unions.
        continue;
      }
      const ri = find(i);
      const rj = find(j);
      if (ri === rj) {
        emit('COMPARE', `"${strs[i]}"~"${strs[j]}"`, `Compare "${strs[i]}" and "${strs[j]}": they differ in ${diffs} positions, so they are similar — but already in the same group, so the group count stays ${groups}.`, { pair: [i, j], diffs: diffs, united: false });
        adj[i].push(j);
        adj[j].push(i);
        continue;
      }
      // Union by size.
      adj[i].push(j);
      adj[j].push(i);
      let big = ri;
      let small = rj;
      if (size[big] < size[small]) {
        big = rj;
        small = ri;
      }
      parent[small] = big;
      size[big] += size[small];
      groups -= 1;
      emit('UNION', `"${strs[i]}"~"${strs[j]}"`, `Compare "${strs[i]}" and "${strs[j]}": they differ in exactly ${diffs} positions, so they are similar — union their groups. The group count drops to ${groups}.`, { pair: [i, j], diffs: diffs, united: true });
    }
  }

  emit('DONE', `${groups} groups`, `Every pair has been compared. The strings collapse into ${groups} similar ${groups === 1 ? 'group' : 'groups'}.`, { pair: null, diffs: null, united: false , done: true }, 'good');

  return frames;
}

function colorOf(parent: number[], node: number): number {
  let r = node;
  while (parent[r] !== r) r = parent[r];
  return r % 3;
}

function View({ frame }: PluginViewProps<SSGState>) {
  const s = frame.state;
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="groups" v={s.groups} tone="accent" />
        {s.pair && s.diffs !== null && <RailStat k="diffs" v={s.diffs} />}
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.groups} tone="good" />}
    </>}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${colorOf(s.parent, node)}`}
        label={(node) => s.strs[node]}
        activeNode={s.pair ? s.pair[0] : null}
        inspectNode={s.pair ? s.pair[1] : null}
        highlightEdge={s.pair}
        nodeRadius={26}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SSGState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="strings" v={s.strs.length} />
      <InspectorRow k="groups" v={s.groups} />
      <InspectorRow k="comparing" v={s.pair ? `"${s.strs[s.pair[0]]}" ~ "${s.strs[s.pair[1]]}"` : '—'} />
      <InspectorRow k="differing positions" v={s.diffs ?? '—'} />
    </VarGrid>
  );
}

const S1: SSGInput = {
  // Classic LeetCode example: {tars, rats, arts} and {star} → 2 groups.
  strs: ['tars', 'rats', 'arts', 'star'],
  pos: circleLayout(4),
};

const S2: SSGInput = {
  // {abc, bac, cba (via bac), acb (via abc)} all link into one group; "xyz" stays alone → 2 groups.
  strs: ['abc', 'bac', 'acb', 'cba', 'xyz'],
  pos: circleLayout(5),
};

export const manifestId = 'imp-9-similar-string-groups';
export const title = 'Similar String Groups';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'tars', label: 'tars / rats / arts / star', value: S1 },
    { id: 'abc', label: 'abc family + xyz', value: S2 },
  ] satisfies SampleInput<SSGInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SSGState | undefined;
    return { ok: true, label: `${s?.groups ?? 0} groups` };
  },
};
