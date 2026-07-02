import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

// adj is the prerequisite graph: an edge pre → course means "course depends on pre".
// You can finish all courses iff this directed graph has no cycle.
interface CSInput {
  adj: number[][];
  pos: [number, number][];
}

// color: 0 = white (untaken) → team-0, 1 = grey (on the DFS stack) → team-2, 2 = black (cleared) → team-1
interface CSState {
  adj: number[][];
  pos: [number, number][];
  color: number[];
  active: number | null;
  stack: number[];
  backEdge: [number, number] | null;
  canFinish: boolean;
  done: boolean;
}

function record({ adj, pos }: CSInput): Frame<CSState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const stack: number[] = [];
  let cycle = false;

  const { emit, frames } = createRecorder<CSState>(() => ({
    adj,
    pos,
    color: color.slice(),
    active: null,
    stack: stack.slice(),
    backEdge: null,
    canFinish: !cycle,
    done: false,
  }));

  emit(
    'INIT',
    'all untaken',
    'Course Schedule asks whether every course can be finished. An edge pre → course means the course depends on pre, so all courses are completable exactly when this prerequisite graph has no cycle. We run a 3-colour DFS; an edge into a grey course (one still on the stack) is a circular dependency.',
    { active: null, backEdge: null },
  );

  const dfs = (v: number): boolean => {
    color[v] = 1;
    stack.push(v);
    emit('ENTER', `start ${v} (grey)`, `Start course ${v} and colour it grey — it is now in progress on the recursion stack.`, { active: v, backEdge: null });

    for (const nb of adj[v]) {
      if (color[nb] === 1) {
        cycle = true;
        emit(
          'BACK',
          `cycle ${v}→${nb}`,
          `Course ${v} unlocks ${nb}, but ${nb} is grey and still in progress — a circular dependency. Not all courses can be finished.`,
          { active: v, backEdge: [v, nb] },
          'bad',
        );
        return true;
      }
      if (color[nb] === 0) {
        emit('WALK', `${v}→${nb}`, `Course ${v} unlocks white course ${nb}; recurse into ${nb} first.`, { active: v, backEdge: [v, nb] });
        if (dfs(nb)) return true;
        emit('RESUME', `resume ${v}`, `Back at course ${v} after clearing everything reachable from ${nb}; check its remaining unlocks.`, { active: v, backEdge: null });
      }
    }

    color[v] = 2;
    stack.pop();
    emit('LEAVE', `clear ${v} (black)`, `Course ${v} has all its unlocks cleared — colour it black and remove it from the stack.`, { active: v, backEdge: null });
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      if (dfs(i)) break;
    }
  }

  if (cycle) {
    emit('DONE', 'canFinish: false', 'A circular dependency was found, so the courses cannot all be finished. Answer: false.', { active: null, backEdge: null, done: true }, 'bad');
  } else {
    emit('DONE', 'canFinish: true', 'Every course cleared with no circular dependency, so all courses can be finished. Answer: true.', { active: null, backEdge: null, done: true }, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<CSState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailStack label="dfs stack" items={s.stack.map(String)} />
      <RailGroup label="scan">
        <RailStat k="node" v={s.active ?? '—'} tone="accent" />
        <RailStat k="back edge" v={s.backEdge ? `${s.backEdge[0]}→${s.backEdge[1]}` : '—'} tone={s.backEdge ? 'bad' : undefined} />
      </RailGroup>
      {s.done && (
        <RailResult label="canFinish" value={s.canFinish ? 'true' : 'false'} tone={s.canFinish ? 'good' : 'bad'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        highlightEdge={s.backEdge}
        edgeTone={s.done && !s.canFinish ? 'clash' : s.backEdge && !s.canFinish ? 'clash' : 'active'}
        directed
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cleared = s.color.filter((c) => c === 2).length;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="in progress" v={s.stack.length ? `[${s.stack.join(', ')}]` : '∅'} />
      <InspectorRow k="circular dep" v={s.backEdge ? `${s.backEdge[0]}→${s.backEdge[1]}` : '—'} />
      <InspectorRow k="cleared" v={`${cleared} / ${s.adj.length}`} />
      <InspectorRow k="canFinish" v={s.done ? (s.canFinish ? 'true' : 'false') : '…'} />
    </VarGrid>
  );
}

// Acyclic prereqs (canFinish = true): 0 unlocks 1 and 2, both unlock 3, 3 unlocks 4.
const ACYCLIC: CSInput = {
  adj: [[1, 2], [3], [3], [4], []],
  pos: circleLayout(5),
};
// Cyclic prereqs (canFinish = false): 0→1→2→0 is a circular dependency.
const CYCLIC: CSInput = {
  adj: [[1], [2], [0], [4], []],
  pos: circleLayout(5),
};

export const manifestId = 'imp-20-course-schedule';
export const title = 'Course Schedule';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'acyclic', label: 'no cycle (true)', value: ACYCLIC },
    { id: 'cyclic', label: 'cycle (false)', value: CYCLIC },
  ] satisfies SampleInput<CSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CSState | undefined;
    const canFinish = s ? s.canFinish : true;
    return { ok: canFinish, label: `canFinish: ${canFinish}` };
  },
};
