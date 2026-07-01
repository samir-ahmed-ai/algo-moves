import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const degrees = new Array<number>(n).fill(0);
  const frames: Frame<RankState>[] = [];
  let best = 0;
  let bestPair: [number, number] | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    scan: number | null,
    a: number | null,
    b: number | null,
    edge: [number, number] | null,
    pairRank: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        degrees: degrees.slice(),
        scan,
        a,
        b,
        edge,
        pairRank,
        best,
        bestPair: bestPair ? [bestPair[0], bestPair[1]] : null,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `network rank`,
    `The network rank of a pair (a, b) is deg(a) + deg(b), minus 1 if a and b are directly connected (that shared road is counted once, not twice). We first count every degree, then test all pairs and keep the maximum rank.`,
    null,
    null,
    null,
    null,
    null,
  );

  for (let v = 0; v < n; v++) {
    degrees[v] = adj[v].length;
    emit(
      'DEGREE',
      `deg(${v})=${degrees[v]}`,
      `Count the roads at city ${v}: it has ${degrees[v]} incident edge${degrees[v] === 1 ? '' : 's'}, so deg(${v}) = ${degrees[v]}.`,
      v,
      null,
      null,
      null,
      null,
    );
  }

  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const connected = adj[a].includes(b);
      const rank = degrees[a] + degrees[b] - (connected ? 1 : 0);
      const note = connected
        ? `directly connected, so subtract 1: ${degrees[a]} + ${degrees[b]} − 1 = ${rank}.`
        : `not directly connected, so no subtraction: ${degrees[a]} + ${degrees[b]} = ${rank}.`;
      emit(
        'PAIR',
        `(${a},${b})=${rank}`,
        `Pair (${a}, ${b}): deg ${degrees[a]} and deg ${degrees[b]}; they are ${note}`,
        null,
        a,
        b,
        connected ? [a, b] : null,
        rank,
      );
      if (rank > best) {
        best = rank;
        bestPair = [a, b];
        emit(
          'BEST',
          `best ${best}`,
          `Rank ${rank} beats the previous best — pair (${a}, ${b}) is now the leader with network rank ${best}.`,
          null,
          a,
          b,
          connected ? [a, b] : null,
          rank,
        );
      }
    }
  }

  const pairText = bestPair ? `(${bestPair[0]}, ${bestPair[1]})` : 'none';
  emit(
    'DONE',
    `max rank ${best}`,
    `Every pair checked. The maximal network rank is ${best}, achieved by pair ${pairText}.`,
    null,
    bestPair ? bestPair[0] : null,
    bestPair ? bestPair[1] : null,
    null,
    best,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RankState>) {
  const s = frame.state;
  const nodeClass = (node: number) => {
    if (s.scan === node) return 'team-2';
    if (s.a === node || s.b === node) return 'team-1';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        max network rank <span className="font-mono text-ink">{s.best}</span>
        {s.bestPair && (
          <>
            {' '}
            @ <span className="font-mono text-ink">({s.bestPair[0]}, {s.bestPair[1]})</span>
          </>
        )}
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={nodeClass}
        activeNode={s.a}
        inspectNode={s.b}
        highlightEdge={s.edge}
        height={260}
      />
    </div>
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

export const simulator: DpSimulator = {
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
