import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../core/types';
import { GraphBoard } from '../../components/board/GraphBoard';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases } from './cases';
import { quiz, codePieces } from './practice';
import { VizStage, RailGroup, RailStat, RailStack, RailResult } from '../_shared/vizKit';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';

export interface UFInput {
  n: number;
  /** [u, v, w] undirected weighted edges. */
  edges: [number, number, number][];
  pos: [number, number][];
}

type Status = 'init' | 'consider' | 'accept' | 'reject' | 'done';

export interface UFState {
  adj: number[][];
  pos: [number, number][];
  w: number[][];
  parent: number[];
  currentEdge: [number, number] | null;
  mst: [number, number][];
  sortedEdges: [number, number, number][];
  edgeIdx: number;
  status: Status;
  mstWeight: number;
}

function record({ n, edges, pos }: UFInput): Frame<UFState>[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const w: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  for (const [u, v, ww] of edges) {
    adj[u]!.push(v);
    adj[v]!.push(u);
    w[u]![v] = ww;
    w[v]![u] = ww;
  }

  const sortedEdges = edges.slice().sort((a, b) => a[2] - b[2]);

  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array<number>(n).fill(0);

  const find = (x: number): number => {
    while (parent[x]! !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra]! < rank[rb]!) parent[ra] = rb;
    else if (rank[ra]! > rank[rb]!) parent[rb] = ra;
    else {
      parent[rb] = ra;
      rank[ra]!++;
    }
  };

  const mst: [number, number][] = [];
  let mstWeight = 0;
  const frames: Frame<UFState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    currentEdge: [number, number] | null,
    edgeIdx: number,
    status: Status,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: {
        adj,
        pos,
        w,
        parent: parent.slice(),
        currentEdge,
        mst: mst.map((e) => [e[0], e[1]] as [number, number]),
        sortedEdges,
        edgeIdx,
        status,
        mstWeight,
      },
    });

  emit(
    'INIT',
    `${n} sets`,
    `Kruskal's MST. Each node starts as its own disjoint set; sort all ${edges.length} edges by weight ascending and consider them cheapest-first.`,
    null,
    -1,
    'init',
  );

  for (let i = 0; i < sortedEdges.length && mst.length < n - 1; i++) {
    const [u, v, ww] = sortedEdges[i]!;
    emit(
      'CONSIDER',
      `(${u},${v}) w=${ww}`,
      `Consider the next-cheapest edge (${u},${v}) with weight ${ww}. Check whether its endpoints are already in the same set.`,
      [u, v],
      i,
      'consider',
    );
    const ru = find(u);
    const rv = find(v);
    if (ru !== rv) {
      union(u, v);
      mst.push([u, v]);
      mstWeight += ww;
      emit(
        'ACCEPT',
        `+${ww} → ${mstWeight}`,
        `Roots differ (${ru} vs ${rv}) — no cycle. Union the sets and add edge (${u},${v}) to the MST; total weight is now ${mstWeight}.`,
        [u, v],
        i,
        'accept',
      );
    } else {
      emit(
        'REJECT',
        `cycle (${u},${v})`,
        `Both endpoints already share root ${ru}. Adding (${u},${v}) would close a cycle, so skip it.`,
        [u, v],
        i,
        'reject',
      );
    }
  }

  emit(
    'DONE',
    `MST ${mstWeight}`,
    `Spanning tree complete with ${mst.length} edges connecting all ${n} nodes at minimum total weight ${mstWeight}.`,
    null,
    sortedEdges.length,
    'done',
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<UFState>) {
  const s = frame.state;
  const n = s.parent.length;
  let sets = 0;
  for (let i = 0; i < n; i++) if (s.parent[i] === i) sets++;
  const considered = s.edgeIdx >= 0 ? Math.min(s.edgeIdx + 1, s.sortedEdges.length) : 0;
  const mstEdgeItems = s.mst.map((e) => ({
    label: `${e[0]}–${e[1]} (${s.w[e[0]]![e[1]]})`,
    tone: 'good' as const,
  }));
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="considered" v={`${considered}/${s.sortedEdges.length}`} />
            <RailStat k="sets" v={sets} />
          </RailGroup>
          <RailStack label="MST edges" items={mstEdgeItems} />
          <RailResult
            label="weight"
            value={s.mstWeight}
            tone={s.status === 'done' ? 'good' : 'accent'}
          />
        </>
      }
    >
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={() => 'team-0'}
        highlightEdge={s.currentEdge}
        edgeTone={s.status === 'reject' ? 'clash' : 'active'}
        edgeLabel={(a, b) => {
          const weight = s.w[a]?.[b];
          return weight !== undefined && weight >= 0 ? weight : undefined;
        }}
        height={264}
      />
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<UFState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => {
        const n = s.parent.length;
        let sets = 0;
        for (let i = 0; i < n; i++) if (s.parent[i] === i) sets++;
        const considered = s.edgeIdx >= 0 ? Math.min(s.edgeIdx + 1, s.sortedEdges.length) : 0;
        return (
          <>
            <InspectorRow k="edges considered" v={`${considered} / ${s.sortedEdges.length}`} />
            <InspectorRow k="MST size" v={`${s.mst.length} / ${n - 1}`} />
            <InspectorRow k="MST weight" v={s.mstWeight} />
            <InspectorRow k="disjoint sets" v={sets} />
          </>
        );
      }}
    />
  );
}

const goSolution = `package main
import "sort"

type DSU struct {
	parent []int
	rank   []int
}

func newDSU(n int) *DSU {
	p := make([]int, n)
	for i := range p {
		p[i] = i
	}
	return &DSU{parent: p, rank: make([]int, n)}
}

func (d *DSU) find(x int) int {
	for d.parent[x] != x {
		d.parent[x] = d.parent[d.parent[x]] // path compression
		x = d.parent[x]
	}
	return x
}

func (d *DSU) union(a, b int) bool {
	ra, rb := d.find(a), d.find(b)
	if ra == rb {
		return false // same set → would form a cycle
	}
	if d.rank[ra] < d.rank[rb] {
		ra, rb = rb, ra
	}
	d.parent[rb] = ra
	if d.rank[ra] == d.rank[rb] {
		d.rank[ra]++
	}
	return true
}

func kruskal(n int, edges [][3]int) (mst [][3]int, total int) {
	sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })
	dsu := newDSU(n)
	for _, e := range edges {
		if len(mst) == n-1 {
			break
		}
		if dsu.union(e[0], e[1]) {
			mst = append(mst, e)
			total += e[2]
		}
	}
	return mst, total
}
`;

const inputs: SampleInput<UFInput>[] = [
  {
    id: 'pentagon',
    label: '5-node weighted graph',
    value: {
      n: 5,
      edges: [
        [0, 1, 2],
        [0, 3, 6],
        [1, 2, 3],
        [1, 3, 8],
        [1, 4, 5],
        [2, 4, 7],
        [3, 4, 9],
      ],
      pos: [
        [160, 40],
        [60, 120],
        [110, 220],
        [260, 120],
        [210, 220],
      ],
    },
  },
  {
    id: 'hex',
    label: '6-node weighted graph',
    value: {
      n: 6,
      edges: [
        [0, 1, 4],
        [0, 2, 3],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 4],
        [3, 4, 2],
        [4, 5, 6],
        [2, 5, 5],
      ],
      pos: [
        [60, 60],
        [180, 40],
        [120, 140],
        [240, 140],
        [180, 230],
        [60, 200],
      ],
    },
  },
];

const verdict = (frames: Frame<UFState>[]) => {
  const last = frames[frames.length - 1];
  return { ok: true, label: `MST ${last?.state.mstWeight ?? 0}` };
};

const casesIntro =
  'Kruskal sorts edges by weight and walks them cheapest-first. An edge is accepted only when find() shows its endpoints sit in different sets; if they already share a root, adding it would close a cycle, so it is skipped. After n-1 accepts every node shares one root.';

const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  simulateSide: true,
  practice: {
    quiz,
    codePieces,
    cases: {
      good: goodCases,
      bad: badCases,
      intro: casesIntro,
      goodLabel: 'worked MSTs — every node connected',
      badLabel: 'cycle edges the disjoint-set rejects',
    },
    simulateQuestion: 'Which move comes next?',
  },
});

export const unionFindPlugin = definePlugin<UFInput, UFState>({
  meta: {
    id: 'union-find',
    title: 'Union-Find · Kruskal MST',
    difficulty: 'Medium',
    tags: ['graph', 'union-find', 'mst', 'greedy'],
    source: 'https://leetcode.com/problems/graph-valid-tree/',
    summary:
      "Kruskal's MST driven by a disjoint-set: sort edges by weight, union endpoints in different sets (add to tree), skip same-set edges (cycle).",
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'n', label: 'Nodes (n)', type: 'number', min: 2, max: 12 }],
});
