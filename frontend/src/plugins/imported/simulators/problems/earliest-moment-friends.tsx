import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

/** A friendship log: [timestamp, personX, personY], people are 0-indexed. */
type Log = [number, number, number];

interface EMInput {
  /** Number of people (0..n-1). */
  n: number;
  logs: Log[];
  pos: [number, number][];
}

interface EMState {
  parent: number[];
  size: number[];
  /** Union edges drawn so far (0-indexed). */
  adj: number[][];
  pos: [number, number][];
  /** Highlighted union pair (0-indexed) or null. */
  pair: [number, number] | null;
  /** Timestamp of the log currently processed, or null. */
  ts: number | null;
  components: number;
  /** Earliest timestamp at which everyone is connected, or null if not yet / never. */
  earliest: number | null;
  done: boolean;
}

function record({ n, logs, pos }: EMInput): Frame<EMState>[] {
  // Sort logs by timestamp ascending (stable copy — never mutate the input).
  const sorted = logs.slice().sort((a, b) => a[0] - b[0]);

  const parent = Array.from({ length: n }, (_, i) => i);
  const size = new Array<number>(n).fill(1);
  const adj: number[][] = Array.from({ length: n }, () => []);
  let components = n;
  let earliest: number | null = null;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x]! = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const { emit, frames } = createRecorder<EMState>(() => ({
    parent: parent.slice(),
    size: size.slice(),
    adj: adj.map((row) => row.slice()),
    pos: pos,
    components: components,
    earliest: earliest,
    pair: null,
    ts: null,
    done: false,
  }));
  // renamed from snapshot

  emit(
    'INIT',
    `${n} people · ${sorted.length} logs`,
    `Earliest Moment Everyone Becomes Friends: ${n} people start as ${n} separate components. We sort the ${sorted.length} friendship logs by timestamp ascending and union each pair; the answer is the first timestamp at which the component count reaches 1.`,
    { pair: null, ts: null },
  );

  for (const [ts, x, y] of sorted) {
    adj[x]!.push(y);
    adj[y]!.push(x);
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) {
      emit(
        'UNION',
        `t=${ts}: ${x}~${y}`,
        `At t=${ts}, ${x} and ${y} become friends, but they are already in the same component (root ${rx}). The component count stays ${components}.`,
        { pair: [x, y], ts: ts },
      );
      continue;
    }
    // Union by size.
    let big = rx;
    let small = ry;
    if (size[big]! < size[small]!) {
      big = ry;
      small = rx;
    }
    parent[small] = big;
    size[big]! += size[small]!;
    components -= 1;
    if (components === 1 && earliest === null) {
      earliest = ts;
      emit(
        'CONNECTED',
        `t=${ts}: all joined`,
        `At t=${ts}, ${x} and ${y} merge their groups and the component count drops to 1 — everyone is now connected. This is the earliest such moment, so the answer is ${ts}.`,
        { pair: [x, y], ts: ts },
        'good',
      );
    } else {
      emit(
        'UNION',
        `t=${ts}: ${x}~${y}`,
        `At t=${ts}, ${x} and ${y} merge their groups under root ${big}; the component count drops to ${components}.`,
        { pair: [x, y], ts: ts },
      );
    }
  }

  if (earliest !== null) {
    emit(
      'DONE',
      `earliest = ${earliest}`,
      `Everyone became connected at timestamp ${earliest} — the earliest moment when all ${n} people are friends.`,
      { pair: null, ts: earliest, done: true },
      'good',
    );
  } else {
    emit(
      'DONE',
      `earliest = -1`,
      `All logs processed but ${components} components remain — the group never fully connects, so the answer is -1.`,
      { pair: null, ts: null, done: true },
      'bad',
    );
  }

  return frames;
}

function colorOf(parent: number[], node: number): number {
  let r = node;
  while (parent[r] !== r) r = parent[r]!;
  return r % 3;
}

function View({ frame }: PluginViewProps<EMState>) {
  const s = frame.state;
  const ans = s.earliest ?? (s.done ? -1 : null);
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat
              k="components"
              v={s.components}
              tone={s.components === 1 ? 'good' : undefined}
            />
            <RailStat k="t" v={s.ts ?? '—'} tone="accent" />
          </RailGroup>
          {ans !== null && (
            <RailResult label="earliest" value={ans} tone={ans === -1 ? 'bad' : 'good'} />
          )}
        </>
      }
    >
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${colorOf(s.parent, node)}`}
        activeNode={s.pair ? s.pair[0] : null}
        inspectNode={s.pair ? s.pair[1] : null}
        highlightEdge={s.pair}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<EMState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="people" v={s.parent.length} />
      <InspectorRow k="components" v={s.components} />
      <InspectorRow k="timestamp" v={s.ts ?? '—'} />
      <InspectorRow k="union pair" v={s.pair ? `${s.pair[0]} ~ ${s.pair[1]}` : '—'} />
      <InspectorRow k="earliest moment" v={s.earliest ?? (s.done ? -1 : '—')} />
    </VarGrid>
  );
}

const E1: EMInput = {
  // Connects fully at t=20190301 (LeetCode-style example, 6 people).
  n: 6,
  logs: [
    [20190101, 0, 1],
    [20190104, 3, 4],
    [20190107, 2, 3],
    [20190211, 1, 5],
    [20190224, 2, 4],
    [20190301, 0, 3],
    [20190312, 1, 2],
    [20190322, 4, 5],
  ],
  pos: circleLayout(6),
};

const E2: EMInput = {
  // Never fully connects: node 4 stays isolated → answer -1.
  n: 5,
  logs: [
    [10, 0, 1],
    [20, 1, 2],
    [30, 0, 2],
    [40, 2, 3],
  ],
  pos: circleLayout(5),
};

export const manifestId = 'imp-14-the-earliest-moment-when-everyone-become-friends';
export const title = 'The Earliest Moment When Everyone Become Friends';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'connects', label: '6 people (connects)', value: E1 },
    { id: 'never', label: '5 people (never)', value: E2 },
  ] satisfies SampleInput<EMInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as EMState | undefined;
    const ans = s?.earliest ?? -1;
    return { ok: ans !== -1, label: `earliest = ${ans}` };
  },
};
