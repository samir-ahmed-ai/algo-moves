import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface MonarchyInput {
  /**
   * Parent→children lines, e.g. "king alice bob". The first word is the parent,
   * the rest are its successors in birth order. The first line's parent is the
   * monarch (root of the succession tree).
   */
  lines: string[];
}

interface MonarchyState {
  /**
   * Level-order (binary) view of the succession tree for TreeBoard. Each cell is
   * a member name or null for an empty slot. Kept to <=2 children per node so the
   * n-ary family tree lays out cleanly on a binary board.
   */
  tree: (string | null)[];
  active: number | null; // tree index of the member just popped / being emitted
  visited: number[]; // tree indices already emitted (done)
  stack: string[]; // pending stack of member names (top = last element)
  order: string[]; // succession order emitted so far
  done: boolean;
}

/** A parsed member: its name and the names of its successors in order. */
interface Member {
  name: string;
  successors: string[];
}

/** Split on runs of spaces / tabs, mirroring the Go splitFields helper. */
function splitFields(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (ch === ' ' || ch === '\t') {
      if (cur !== '') {
        out.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** Build name->Member map and pick the monarch (first line's parent), like buildMonarchyMap. */
function buildMonarchy(lines: string[]): { members: Map<string, Member>; king: string | null } {
  const members = new Map<string, Member>();
  let king: string | null = null;
  const ensure = (name: string): Member => {
    let m = members.get(name);
    if (!m) {
      m = { name, successors: [] };
      members.set(name, m);
    }
    return m;
  };
  for (const line of lines) {
    const parts = splitFields(line);
    if (parts.length < 2) continue;
    const parent = ensure(parts[0]);
    if (parts[0] === 'monarch' || king === null) king = parent.name;
    for (let i = 1; i < parts.length; i++) {
      ensure(parts[i]);
      parent.successors.push(parts[i]);
    }
  }
  return { members, king };
}

/**
 * Assign a binary level-order index to every reachable member so TreeBoard can
 * draw the tree. Child k of node at index i goes to slot 2i+1+k. Inputs are kept
 * small with <=2 successors per member, so no member overflows its two slots.
 */
function layout(king: string, members: Map<string, Member>): {
  tree: (string | null)[];
  indexOf: Map<string, number>;
} {
  const indexOf = new Map<string, number>();
  const tree: (string | null)[] = [];
  const place = (name: string, idx: number) => {
    while (tree.length <= idx) tree.push(null);
    tree[idx] = name;
    indexOf.set(name, idx);
    const succ = members.get(name)?.successors ?? [];
    for (let k = 0; k < succ.length; k++) place(succ[k], 2 * idx + 1 + k);
  };
  place(king, 0);
  return { tree, indexOf };
}

function record({ lines }: MonarchyInput): Frame<MonarchyState>[] {
  const frames: Frame<MonarchyState>[] = [];
  const { members, king } = buildMonarchy(lines);

  if (king === null) {
    frames.push({
      move: {
        type: 'DONE',
        note: 'no monarch',
        caption: 'No monarch could be parsed from the input lines, so the succession order is empty.',
        tone: 'bad',
      },
      state: { tree: [], active: null, visited: [], stack: [], order: [], done: true },
    });
    return frames;
  }

  const { tree, indexOf } = layout(king, members);
  const visited: number[] = [];
  const order: string[] = [];

  const snap = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    stack: string[],
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        active,
        visited: visited.slice(),
        stack: stack.slice(),
        order: order.slice(),
        done: type === 'DONE',
      },
    });

  snap(
    'INIT',
    `monarch ${king}`,
    `Monarchy succession: the parent→children lines are parsed into a family tree rooted at the monarch "${king}". An iterative pre-order walk lists each ruler before their descendants — a stack drives it, pushing successors in reverse so the eldest is popped first.`,
    0,
    [king],
  );

  // Iterative pre-order, mirroring preorderSuccessors: pop, emit, push successors reversed.
  const stack: string[] = [king];
  while (stack.length > 0) {
    const curr = stack.pop() as string;
    const idx = indexOf.get(curr) as number;
    order.push(curr);
    visited.push(idx);

    const succ = members.get(curr)?.successors ?? [];
    snap(
      'VISIT',
      curr,
      `Pop "${curr}" off the stack and add it to the succession order (position ${order.length}). ${
        succ.length === 0
          ? `"${curr}" has no successors, so nothing new is pushed.`
          : `Its successors are [${succ.join(', ')}] — push them in reverse so "${succ[0]}" ends up on top and is crowned next.`
      }`,
      idx,
      stack,
      'good',
    );

    for (let i = succ.length - 1; i >= 0; i--) stack.push(succ[i]);

    if (succ.length > 0) {
      snap(
        'PUSH',
        `+${succ.length}`,
        `After pushing the successors of "${curr}" reversed, the stack (top→bottom) is [${[...stack].reverse().join(', ')}]. The next pop takes the top, "${stack[stack.length - 1]}".`,
        idx,
        stack,
      );
    }
  }

  snap(
    'DONE',
    `${order.length} rulers`,
    `The stack is empty — every member has been listed. The full line of succession is: ${order.join(' → ')}.`,
    null,
    [],
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MonarchyState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const total = s.tree.filter((v) => v != null).length;
  const activeName = s.active !== null ? s.tree[s.active] : null;
  const rail = (
    <>
      <RailStack
        label="stack"
        items={[...s.stack].reverse()}
        topLabel="top"
      />
      <RailGroup label="scan">
        <RailStat k="current" v={activeName ?? '—'} tone="accent" />
        <RailStat k="listed" v={`${s.order.length}/${total}`} />
      </RailGroup>
      <RailResult
        label="order"
        value={s.order.length === 0 ? '—' : s.order.join(' → ')}
        tone={s.done ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MonarchyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeName = s.active !== null ? s.tree[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="current" v={activeName ?? '—'} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="next up" v={s.stack.length > 0 ? s.stack[s.stack.length - 1] : '—'} />
      <InspectorRow k="listed" v={s.order.length} />
      <InspectorRow k="order" v={s.order.length > 0 ? s.order.join(', ') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-monarchy-succession';
export const title = 'Monarchy succession order';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ms1',
      label: 'king → alice,bob / alice → carol',
      value: { lines: ['king alice bob', 'alice carol dave', 'bob erin'] },
    },
    {
      id: 'ms2',
      label: 'monarch → liz,phil',
      value: { lines: ['monarch liz phil', 'liz anne'] },
    },
  ] satisfies SampleInput<MonarchyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MonarchyState | undefined;
    if (!s || s.order.length === 0) return { ok: false, label: 'no monarch' };
    return { ok: true, label: s.order.join(' → ') };
  },
};
