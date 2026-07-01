import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

/** "M a b" merges the communities of a and b; "Q a" reports a's community size. People are 1-indexed in the op list. */
type Op = ['M', number, number] | ['Q', number];

interface MCInput {
  /** Number of people (1..n). */
  n: number;
  ops: Op[];
  pos: [number, number][];
}

interface MCState {
  /** parent[i] for 0-indexed nodes 0..n-1 (person p is node p-1). */
  parent: number[];
  size: number[];
  /** Union edges drawn so far (0-indexed). */
  adj: number[][];
  pos: [number, number][];
  /** Highlighted union pair (0-indexed) or null. */
  pair: [number, number] | null;
  /** Node being queried (0-indexed) or null. */
  query: number | null;
  /** Latest query answer (community size) or null. */
  answer: number | null;
  components: number;
  done: boolean;
}

function record({ n, ops, pos }: MCInput): Frame<MCState>[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = new Array<number>(n).fill(1);
  const adj: number[][] = Array.from({ length: n }, () => []);
  let components = n;
  let answer: number | null = null;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const frames: Frame<MCState>[] = [];
  const snapshot = (
    type: string,
    note: string,
    caption: string,
    pair: [number, number] | null,
    query: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        parent: parent.slice(),
        size: size.slice(),
        adj: adj.map((row) => row.slice()),
        pos,
        pair,
        query,
        answer,
        components,
        done: type === 'DONE',
      },
    });

  snapshot(
    'INIT',
    `${n} singletons`,
    `Merging Communities: ${n} people each start in their own community, so the component count is ${n}. We replay the operations: "M a b" merges two communities; "Q a" reports the size of a's community.`,
    null,
    null,
  );

  for (const op of ops) {
    if (op[0] === 'M') {
      const a = op[1] - 1;
      const b = op[2] - 1;
      // Draw the merge edge regardless (it reflects the relationship asserted).
      adj[a].push(b);
      adj[b].push(a);
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) {
        snapshot(
          'MERGE',
          `M ${op[1]} ${op[2]}`,
          `Operation M ${op[1]} ${op[2]}: people ${op[1]} and ${op[2]} are already in the same community (root ${ra + 1}), so nothing merges. Component count stays ${components}.`,
          [a, b],
          null,
        );
      } else {
        // Union by size: attach the smaller tree under the larger root.
        let big = ra;
        let small = rb;
        if (size[big] < size[small]) {
          big = rb;
          small = ra;
        }
        parent[small] = big;
        size[big] += size[small];
        components -= 1;
        snapshot(
          'MERGE',
          `M ${op[1]} ${op[2]}`,
          `Operation M ${op[1]} ${op[2]}: union the communities of ${op[1]} and ${op[2]} under root ${big + 1}; the merged community now holds ${size[big]} people and the component count drops to ${components}.`,
          [a, b],
          null,
        );
      }
    } else {
      const a = op[1] - 1;
      const r = find(a);
      answer = size[r];
      snapshot(
        'QUERY',
        `Q ${op[1]} → ${answer}`,
        `Operation Q ${op[1]}: person ${op[1]} sits in the community rooted at ${r + 1}, which contains ${answer} ${answer === 1 ? 'person' : 'people'}. Report ${answer}.`,
        null,
        a,
      );
    }
  }

  const finalNote =
    answer !== null ? `last Q = ${answer}` : `${components} communities`;
  const finalCaption =
    answer !== null
      ? `All operations replayed. The final query reported a community of size ${answer}; ${components} ${components === 1 ? 'community remains' : 'communities remain'} overall.`
      : `All operations replayed. ${components} ${components === 1 ? 'community remains' : 'communities remain'}.`;
  snapshot('DONE', finalNote, finalCaption, null, null, 'good');

  return frames;
}

function colorOf(parent: number[], node: number): number {
  let r = node;
  while (parent[r] !== r) r = parent[r];
  return r % 3;
}

function View({ frame }: PluginViewProps<MCState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        communities = <span className="font-mono text-ink">{s.components}</span>
        {s.answer !== null && (
          <>
            {' · '}last Q = <span className="font-mono text-ink">{s.answer}</span>
          </>
        )}
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${colorOf(s.parent, node)}`}
        label={(node) => String(node + 1)}
        activeNode={s.pair ? s.pair[0] : s.query}
        inspectNode={s.pair ? s.pair[1] : null}
        highlightEdge={s.pair}
        height={260}
      />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MCState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="people" v={s.parent.length} />
      <InspectorRow k="communities" v={s.components} />
      <InspectorRow k="merging" v={s.pair ? `${s.pair[0] + 1} ↔ ${s.pair[1] + 1}` : '—'} />
      <InspectorRow k="querying" v={s.query !== null ? s.query + 1 : '—'} />
      <InspectorRow k="last Q answer" v={s.answer ?? '—'} />
    </VarGrid>
  );
}

const M1: MCInput = {
  n: 6,
  ops: [
    ['M', 1, 2],
    ['M', 3, 4],
    ['Q', 1],
    ['M', 2, 4],
    ['Q', 3],
    ['M', 5, 6],
    ['Q', 5],
    ['M', 4, 5],
    ['Q', 1],
  ],
  pos: circleLayout(6),
};

const M2: MCInput = {
  n: 7,
  ops: [
    ['M', 1, 2],
    ['M', 2, 3],
    ['Q', 3],
    ['M', 5, 6],
    ['M', 6, 7],
    ['Q', 7],
    ['M', 3, 7],
    ['Q', 1],
    ['M', 4, 4],
    ['Q', 4],
  ],
  pos: circleLayout(7),
};

export const manifestId = 'imp-8-merging-communities';
export const title = 'Merging Communities';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'm6', label: '6 people', value: M1 },
    { id: 'm7', label: '7 people', value: M2 },
  ] satisfies SampleInput<MCInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MCState | undefined;
    return { ok: true, label: s?.answer !== null && s ? `last Q = ${s.answer}` : `${s?.components ?? 0} communities` };
  },
};
