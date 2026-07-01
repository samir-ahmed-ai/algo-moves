import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface MSInput {
  scores: number[];
  edges: [number, number][];
  adj: number[][];
  pos: [number, number][];
}

interface MSState {
  scores: number[];
  adj: number[][];
  pos: [number, number][];
  edge: [number, number] | null; // edge (u, v) being scanned
  seq: number[]; // current candidate 4-node path a-u-v-b
  best: number;
  bestSeq: number[];
  done: boolean;
}

function insertTop3(top: number[], node: number, scores: number[]): number[] {
  const out = [...top, node];
  for (let i = out.length - 1; i > 0; i--) {
    if (scores[out[i]] > scores[out[i - 1]]) {
      const t = out[i];
      out[i] = out[i - 1];
      out[i - 1] = t;
    }
  }
  return out.length > 3 ? out.slice(0, 3) : out;
}

function record({ scores, edges, adj, pos }: MSInput): Frame<MSState>[] {
  const n = scores.length;
  const frames: Frame<MSState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    edge: [number, number] | null,
    seq: number[],
    best: number,
    bestSeq: number[],
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { scores, adj, pos, edge, seq: seq.slice(), best, bestSeq: bestSeq.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    'top-3',
    `We want a 4-node path a-u-v-b (all distinct) maximizing scores[a]+scores[u]+scores[v]+scores[b]. For each node we keep only its 3 highest-scoring neighbours — that is enough to dodge collisions — then for every edge (u, v) we try the best a near u and b near v.`,
    null,
    [],
    -1,
    [],
  );

  const top3: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    top3[u] = insertTop3(top3[u], v, scores);
    top3[v] = insertTop3(top3[v], u, scores);
  }

  let best = -1;
  let bestSeq: number[] = [];

  for (const [u, v] of edges) {
    emit('EDGE', `edge ${u}-${v}`, `Scan edge ${u}-${v} (scores ${scores[u]} and ${scores[v]}). Try each top-3 neighbour a of ${u} and b of ${v}, keeping all four distinct.`, [u, v], [], best, bestSeq);
    for (const a of top3[u]) {
      if (a === v) continue;
      for (const b of top3[v]) {
        if (b === u || b === a) continue;
        const s = scores[a] + scores[u] + scores[v] + scores[b];
        const seq = [a, u, v, b];
        if (s > best) {
          best = s;
          bestSeq = seq;
          emit('IMPROVE', `score ${s}`, `Path ${a}-${u}-${v}-${b} scores ${scores[a]}+${scores[u]}+${scores[v]}+${scores[b]} = ${s}, a new best.`, [u, v], seq, best, bestSeq, undefined);
        } else {
          emit('TRY', `score ${s}`, `Path ${a}-${u}-${v}-${b} scores ${s}, not better than the current best ${best}.`, [u, v], seq, best, bestSeq);
        }
      }
    }
  }

  const ans = best < 0 ? '-1 (no valid 4-node path)' : `${best} via ${bestSeq.join('-')}`;
  emit('DONE', `${best}`, `All edges scanned. Maximum score = ${ans}.`, null, bestSeq, best, bestSeq, 'good');
  return frames;
}

function team(s: MSState, node: number): string {
  if (s.seq.length === 4) {
    if (node === s.seq[1] || node === s.seq[2]) return 'team-1'; // the edge endpoints u, v
    if (node === s.seq[0] || node === s.seq[3]) return 'team-2'; // the extensions a, b
  }
  return 'team-0';
}

function View({ frame }: PluginViewProps<MSState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="edge" v={s.edge ? `${s.edge[0]}-${s.edge[1]}` : '—'} />
        <RailStat k="candidate" v={s.seq.length === 4 ? s.seq.join('-') : '—'} tone="accent" />
      </RailGroup>
      <RailResult
        label="best"
        value={s.best < 0 ? '−1' : `${s.best}${s.bestSeq.length === 4 ? ` [${s.bestSeq.join('-')}]` : ''}`}
        tone={s.done ? 'good' : s.best >= 0 ? 'accent' : 'bad'}
      />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => team(s, node)}
        label={(node) => `${node}:${s.scores[node]}`}
        activeNode={s.seq.length === 4 ? s.seq[1] : null}
        inspectNode={s.seq.length === 4 ? s.seq[2] : null}
        highlightEdge={s.edge}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="edge" v={s.edge ? `${s.edge[0]}-${s.edge[1]}` : '—'} />
      <InspectorRow k="candidate" v={s.seq.length === 4 ? s.seq.join('-') : '—'} />
      <InspectorRow k="best score" v={s.best < 0 ? '−1' : s.best} />
      <InspectorRow k="best path" v={s.bestSeq.length === 4 ? s.bestSeq.join('-') : '—'} />
    </VarGrid>
  );
}

function build(scores: number[], edgeList: [number, number][]): MSInput {
  const adj: number[][] = Array.from({ length: scores.length }, () => []);
  for (const [u, v] of edgeList) {
    adj[u].push(v);
    adj[v].push(u);
  }
  return { scores, edges: edgeList, adj, pos: circleLayout(scores.length) };
}

const G5 = build([5, 2, 9, 8, 4], [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 2],
  [1, 3],
  [2, 4],
]);
const G4 = build([5, 2, 9, 1], [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 3],
]);

export const manifestId = 'imp-19-maximum-score-of-a-node-sequence';
export const title = 'Maximum Score of a Node Sequence';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g5', label: '5 nodes', value: G5 },
    { id: 'g4', label: '4 nodes', value: G4 },
  ] satisfies SampleInput<MSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MSState | undefined;
    return { ok: true, label: `score ${s ? s.best : -1}` };
  },
};
