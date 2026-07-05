import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface RankInput {
  adj: number[][];
  pos: [number, number][];
}

interface RankState {
  adj: number[][];
  pos: [number, number][];
  degrees: number[];
  /** Phase-1 vertex being scanned, or null outside phase 1. */
  scan: number | null;
  /** Candidate pair (a, b) under consideration, or null. */
  a: number | null;
  b: number | null;
  /** Edge to highlight when the pair is directly connected. */
  edge: [number, number] | null;
  /** Rank of the current pair, if computed. */
  pairRank: number | null;
  best: number;
  bestPair: [number, number] | null;
  done: boolean;
}

function record({ adj, pos }: RankInput): Frame<RankState>[] {
  const n = adj.length;
  const degrees = new Array<number>(n).fill(0);  let best = 0;
  let bestPair: [number, number] | null = null;

  const { emit, frames } = createRecorder<RankState>(() => ({
        adj: adj,
        pos: pos,
        degrees: degrees.slice(),
        best: best,
        bestPair: bestPair ? [bestPair[0], bestPair[1]] : null,
        scan: null,
        a: null,
        b: null,
        edge: null,
        pairRank: null,
        done: false
      }));

  emit('INIT', `network rank`, `The network rank of a pair (a, b) is deg(a) + deg(b), minus 1 if a and b are directly connected (that shared road is counted once, not twice). We first count every degree, then test all pairs and keep the maximum rank.`, { scan: null, a: null, b: null, edge: null, pairRank: null });

  for (let v = 0; v < n; v++) {
    degrees[v] = adj[v].length;
    emit('DEGREE', `deg(${v})=${degrees[v]}`, `Count the roads at city ${v}: it has ${degrees[v]} incident edge${degrees[v] === 1 ? '' : 's'}, so deg(${v}) = ${degrees[v]}.`, { scan: v, a: null, b: null, edge: null, pairRank: null });
  }

  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const connected = adj[a].includes(b);
      const rank = degrees[a] + degrees[b] - (connected ? 1 : 0);
      const note = connected
        ? `directly connected, so subtract 1: ${degrees[a]} + ${degrees[b]} − 1 = ${rank}.`
        : `not directly connected, so no subtraction: ${degrees[a]} + ${degrees[b]} = ${rank}.`;
      emit('PAIR', `(${a},${b})=${rank}`, `Pair (${a}, ${b}): deg ${degrees[a]} and deg ${degrees[b]}; they are ${note}`, { scan: null, a: a, b: b, edge: connected ? [a, b] : null, pairRank: rank });
      if (rank > best) {
        best = rank;
        bestPair = [a, b];
        emit('BEST', `best ${best}`, `Rank ${rank} beats the previous best — pair (${a}, ${b}) is now the leader with network rank ${best}.`, { scan: null, a: a, b: b, edge: connected ? [a, b] : null, pairRank: rank });
      }
    }
  }

  const pairText = bestPair ? `(${bestPair[0]}, ${bestPair[1]})` : 'none';
  emit('DONE', `max rank ${best}`, `Every pair checked. The maximal network rank is ${best}, achieved by pair ${pairText}.`, { scan: null, a: bestPair ? bestPair[0] : null, b: bestPair ? bestPair[1] : null, edge: null, pairRank: best , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RankState>) {
  const s = frame.state;
  const nodeClass = (node: number) => {
    if (s.scan === node) return 'team-2';
    if (s.a === node || s.b === node) return 'team-1';
    return 'team-0';
  };
  const pair = s.a !== null && s.b !== null ? `(${s.a},${s.b})` : '—';
  const rail = (
    <>
      <RailGroup label="degrees">
        {s.degrees.map((d, i) => (
          <RailStat key={i} k={`${i}`} v={d} tone={s.scan === i ? 'accent' : undefined} />
        ))}
      </RailGroup>
      <RailGroup label="pair">
        <RailStat k="nodes" v={pair} tone={s.a !== null ? 'accent' : undefined} />
        <RailStat k="rank" v={s.pairRank ?? '—'} />
      </RailGroup>
      <RailGroup label="best">
        <RailStat k="rank" v={s.best} tone={s.best > 0 ? 'good' : undefined} />
        <RailStat k="pair" v={s.bestPair ? `(${s.bestPair[0]},${s.bestPair[1]})` : '—'} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.best} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={140}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={nodeClass}
        activeNode={s.a}
        inspectNode={s.b}
        highlightEdge={s.edge}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RankState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const pair = s.a !== null && s.b !== null ? `(${s.a}, ${s.b})` : '—';
  return (
    <VarGrid>
      <InspectorRow k="degrees" v={`[${s.degrees.join(', ')}]`} />
      <InspectorRow k="pair" v={pair} />
      <InspectorRow k="pair rank" v={s.pairRank ?? '—'} />
      <InspectorRow k="best rank" v={s.best} />
      <InspectorRow k="best pair" v={s.bestPair ? `(${s.bestPair[0]}, ${s.bestPair[1]})` : '—'} />
    </VarGrid>
  );
}

const G5: RankInput = {
  adj: [[1, 2], [0, 2, 3], [0, 1], [1, 4], [3]],
  pos: circleLayout(5),
};
const G6: RankInput = {
  adj: [[1, 2, 3], [0, 2], [0, 1, 3], [0, 2, 4], [3, 5], [4]],
  pos: circleLayout(6),
};

export const manifestId = 'imp-17-maximal-network-rank';
export const title = 'Maximal Network Rank';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g5', label: '5 nodes', value: G5 },
    { id: 'g6', label: '6 nodes', value: G6 },
  ] satisfies SampleInput<RankInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RankState | undefined;
    return { ok: true, label: s ? `max rank ${s.best}` : 'max rank ?' };
  },
};
