import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface DegInput {
  adj: number[][];
  pos: [number, number][];
  /** The vertex whose degree we report as the answer. */
  query: number;
}

interface DegState {
  adj: number[][];
  pos: [number, number][];
  query: number;
  degrees: number[];
  /** Vertex currently being scanned. */
  current: number | null;
  /** Neighbour edge being walked, as [v, u]. */
  edge: [number, number] | null;
  /** Highest degree seen so far, with the vertex that holds it. */
  bestVertex: number;
  bestDegree: number;
  answer: number | null;
  done: boolean;
}

function record({ adj, pos, query }: DegInput): Frame<DegState>[] {
  const n = adj.length;
  const degrees = new Array<number>(n).fill(0);
  const frames: Frame<DegState>[] = [];
  let bestVertex = 0;
  let bestDegree = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    current: number | null,
    edge: [number, number] | null,
    answer: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        query,
        degrees: degrees.slice(),
        current,
        edge,
        bestVertex,
        bestDegree,
        answer,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `degree of ${query}`,
    `In an undirected graph the degree of a vertex is the number of edges incident to it — equivalently, its neighbour count. We scan every vertex, count its incident edges, and report the degree of the queried vertex ${query}.`,
    null,
    null,
    null,
  );

  for (let v = 0; v < n; v++) {
    emit(
      'VERTEX',
      `scan ${v}`,
      `Move to vertex ${v}. Walk each of its incident edges, adding one to its degree per edge.`,
      v,
      null,
      null,
    );
    for (const u of adj[v]) {
      degrees[v] += 1;
      emit(
        'EDGE',
        `${v}-${u}`,
        `Edge ${v}–${u} is incident to vertex ${v}, so its degree rises to ${degrees[v]}.`,
        v,
        [v, u],
        null,
      );
    }
    if (degrees[v] > bestDegree) {
      bestDegree = degrees[v];
      bestVertex = v;
    }
    emit(
      'TALLY',
      `deg(${v})=${degrees[v]}`,
      `Vertex ${v} has degree ${degrees[v]}. Highest degree so far is ${bestDegree} at vertex ${bestVertex}.`,
      v,
      null,
      null,
    );
  }

  const answer = degrees[query];
  emit(
    'DONE',
    `deg(${query})=${answer}`,
    `All degrees counted. The queried vertex ${query} has degree ${answer} (the highest-degree vertex overall is ${bestVertex} with degree ${bestDegree}).`,
    query,
    null,
    answer,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DegState>) {
  const s = frame.state;
  const nodeClass = (node: number) => {
    if (s.current === node) return 'team-2';
    if (s.done && node === s.query) return 'team-1';
    return 'team-0';
  };
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="vertex" v={s.current ?? '—'} tone={s.current !== null ? 'accent' : undefined} />
        <RailStat k="deg" v={s.current !== null ? s.degrees[s.current] : '—'} />
      </RailGroup>
      <RailGroup label="best">
        <RailStat k="v" v={s.bestVertex} />
        <RailStat k="deg" v={s.bestDegree} tone="accent" />
      </RailGroup>
      {s.answer !== null && (
        <RailResult label={`deg(${s.query})`} value={s.answer} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={nodeClass}
        activeNode={s.current}
        inspectNode={s.done ? s.query : null}
        highlightEdge={s.edge}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DegState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.current ?? '—'} />
      <InspectorRow k="query" v={s.query} />
      <InspectorRow k="degrees" v={`[${s.degrees.join(', ')}]`} />
      <InspectorRow k="max degree" v={`${s.bestDegree} @ ${s.bestVertex}`} />
      <InspectorRow k="answer" v={s.answer ?? '—'} />
    </VarGrid>
  );
}

const G6: DegInput = {
  adj: [[1, 2, 3], [0, 2], [0, 1, 3, 4], [0, 2], [2, 5], [4]],
  pos: circleLayout(6),
  query: 2,
};
const G5: DegInput = {
  adj: [[1], [0, 2, 3], [1, 3], [1, 2, 4], [3]],
  pos: circleLayout(5),
  query: 3,
};

export const manifestId = 'imp-22-find-degree-of-vertex';
export const title = 'Find Degree of Vertex';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g6', label: '6 nodes', value: G6 },
    { id: 'g5', label: '5 nodes', value: G5 },
  ] satisfies SampleInput<DegInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DegState | undefined;
    return { ok: true, label: s ? `deg(${s.query}) = ${s.answer}` : 'deg = ?' };
  },
};
