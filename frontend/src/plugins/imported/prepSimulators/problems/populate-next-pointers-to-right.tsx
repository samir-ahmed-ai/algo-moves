import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

// The tree is a level-order array; children of i live at 2i+1 and 2i+2, and a
// null marks an absent slot. The algorithm wires each node's `next` pointer to
// the node immediately to its right on the same level, using O(1) extra space
// by threading down the already-connected level above.
interface PopulateInput {
  tree: (number | null)[];
}

interface PopulateState {
  tree: (number | null)[];
  // next[i] = index of the node to i's right on its level, or null.
  next: (number | null)[];
  leftmost: number | null; // start of the level currently being wired
  cur: number | null; // node on the parent level we are threading through
  wiredChild: number | null; // child index whose `next` we just set (ring)
  wiredTo: number | null; // where that child's `next` now points
  done: boolean;
}

const L = (i: number) => 2 * i + 1;
const R = (i: number) => 2 * i + 2;

function record({ tree }: PopulateInput): Frame<PopulateState>[] {
  const n = tree.length;
  const next = new Array<number | null>(n).fill(null);
  const present = (i: number) => i >= 0 && i < n && tree[i] != null;

  const { emit, frames } = createRecorder<PopulateState>(() => ({
    tree,
    next: next.slice(),
    leftmost: null,
    cur: null,
    wiredChild: null,
    wiredTo: null,
    done: false,
  }));

  if (!present(0)) {
    emit('DONE', 'empty', 'The tree is empty, so there is nothing to connect.', { done: true }, 'bad');
    return frames;
  }

  emit(
    'INIT',
    `${n} slots`,
    'Populate Next Pointers: wire each node to the node on its immediate right, level by level. We reuse the already-built next-links of the current level to reach every parent, so no queue is needed — O(1) space.',
    { leftmost: 0 },
  );

  let leftmost: number | null = 0;
  // Drop to the leftmost node of each level as long as it has a left child —
  // that guarantees a full level below exists to wire (perfect binary tree).
  while (leftmost !== null && present(L(leftmost))) {
    emit(
      'DROP',
      `leftmost=${tree[leftmost]}`,
      `Stand at the leftmost node of this level (value ${tree[leftmost]}). Thread rightward across this level using the next-links we built earlier, wiring the children below as we go.`,
      { leftmost, cur: leftmost },
    );

    let cur: number | null = leftmost;
    let nextLeft: number | null = null;

    while (cur !== null) {
      const lc = L(cur);
      const rc = R(cur);
      if (present(lc)) {
        // left.Next = right
        next[lc] = present(rc) ? rc : null;
        emit(
          'WIRE_LR',
          `${tree[lc]}→${present(rc) ? tree[rc] : '∅'}`,
          `Both children of node ${tree[cur]} share a parent, so link them: left child ${tree[lc]}.next = right child ${present(rc) ? tree[rc] : '(none)'}.`,
          { leftmost, cur, wiredChild: lc, wiredTo: next[lc] },
        );

        // right.Next = cur.Next.Left  (only when cur has a next sibling)
        const sib = next[cur];
        if (sib !== null && present(rc)) {
          next[rc] = present(L(sib)) ? L(sib) : null;
          emit(
            'WIRE_GAP',
            `${tree[rc]}→${next[rc] !== null ? tree[next[rc]] : '∅'}`,
            `Node ${tree[cur]} has a right neighbour (${tree[sib]}) on this level, so bridge the gap: right child ${tree[rc]}.next = that neighbour's left child ${next[rc] !== null ? tree[next[rc]] : '(none)'}.`,
            { leftmost, cur, wiredChild: rc, wiredTo: next[rc] },
          );
        }

        if (nextLeft === null) nextLeft = lc;
      }
      // Advance across the parent level via its own next-link.
      const step: number | null = next[cur];
      if (step !== null) {
        emit(
          'STEP',
          `→${tree[step]}`,
          `Follow node ${tree[cur]}'s next-link to its right neighbour ${tree[step]} and keep wiring the level below.`,
          { leftmost, cur: step },
        );
      }
      cur = step;
    }

    leftmost = nextLeft;
  }

  emit(
    'DONE',
    'connected',
    'Every level is fully threaded: each node now points to the node on its right (or null at the end of a level). Done in O(n) time and O(1) extra space.',
    { leftmost: null, cur: null, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PopulateState>) {
  const s = frame.state;
  const cells = s.tree.map((v) => (v == null ? null : v));
  const nodeClass = (i: number) => {
    if (s.tree[i] == null) return 'team-0';
    if (i === s.cur) return 'team-1';
    if (s.next[i] !== null || i === s.wiredChild || i === s.wiredTo) return 'team-2';
    return 'team-0';
  };

  const links: string[] = [];
  for (let i = 0; i < s.tree.length; i++) {
    if (s.tree[i] != null && s.next[i] !== null) {
      const t = s.next[i];
      links.push(`${s.tree[i]}→${t !== null ? s.tree[t] : '∅'}`);
    }
  }

  const label = (i: number | null) => (i !== null && s.tree[i] != null ? String(s.tree[i]) : '—');
  const wired = s.next.filter((v) => v !== null).length;

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="leftmost" v={label(s.leftmost)} />
        <RailStat k="cur" v={label(s.cur)} tone="accent" />
      </RailGroup>
      <RailStack
        label="next links"
        items={links}
        highlightEnd="bottom"
      />
      <RailGroup label="progress">
        <RailStat k="wired" v={wired} tone={wired > 0 ? 'good' : undefined} />
      </RailGroup>
      {s.done && <RailResult label="status" value="connected" tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={cells} nodeClass={nodeClass} activeNode={s.cur} highlightChild={s.wiredChild} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PopulateState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const wired = s.next.filter((v) => v !== null).length;
  const label = (i: number | null) => (i !== null && s.tree[i] != null ? String(s.tree[i]) : '—');
  return (
    <VarGrid>
      <InspectorRow k="leftmost" v={label(s.leftmost)} />
      <InspectorRow k="cur" v={label(s.cur)} />
      <InspectorRow
        k="wired"
        v={s.wiredChild !== null ? `${label(s.wiredChild)} → ${label(s.wiredTo)}` : '—'}
      />
      <InspectorRow k="next-links set" v={wired} />
      <InspectorRow k="status" v={s.done ? 'connected' : 'threading'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-populate-next-pointers-to-right';
export const title = 'Populate next pointers to right';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'pn7', label: 'perfect tree [1..7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
    { id: 'pn3', label: 'root + 2 leaves', value: { tree: [1, 2, 3] } },
  ] satisfies SampleInput<PopulateInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PopulateState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    const wired = s.next.filter((v) => v !== null).length;
    return { ok: s.done, label: s.done ? `${wired} next-links set` : 'incomplete' };
  },
};
