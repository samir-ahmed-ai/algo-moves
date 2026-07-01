import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<CSState>[] = [];
  let cycle = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    backEdge: [number, number] | null,
    tone?: 'good' | 'bad',
  ): void => {
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        color: color.slice(),
        active,
        stack: stack.slice(),
        backEdge,
        canFinish: !cycle,
        done: type === 'DONE',
      },
    });
  };

  emit(
    'INIT',
    'all untaken',
    'Course Schedule asks whether every course can be finished. An edge pre → course means the course depends on pre, so all courses are completable exactly when this prerequisite graph has no cycle. We run a 3-colour DFS; an edge into a grey course (one still on the stack) is a circular dependency.',
    null,
    null,
  );

  const dfs = (v: number): boolean => {
    color[v] = 1;
    stack.push(v);
    emit('ENTER', `start ${v} (grey)`, `Start course ${v} and colour it grey — it is now in progress on the recursion stack.`, v, null);

    for (const nb of adj[v]) {
      if (color[nb] === 1) {
        cycle = true;
        emit(
          'BACK',
          `cycle ${v}→${nb}`,
          `Course ${v} unlocks ${nb}, but ${nb} is grey and still in progress — a circular dependency. Not all courses can be finished.`,
          v,
          [v, nb],
          'bad',
        );
        return true;
      }
      if (color[nb] === 0) {
        emit('WALK', `${v}→${nb}`, `Course ${v} unlocks white course ${nb}; recurse into ${nb} first.`, v, [v, nb]);
        if (dfs(nb)) return true;
        emit('RESUME', `resume ${v}`, `Back at course ${v} after clearing everything reachable from ${nb}; check its remaining unlocks.`, v, null);
      }
    }

    color[v] = 2;
    stack.pop();
    emit('LEAVE', `clear ${v} (black)`, `Course ${v} has all its unlocks cleared — colour it black and remove it from the stack.`, v, null);
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      if (dfs(i)) break;
    }
  }

  if (cycle) {
    emit('DONE', 'canFinish: false', 'A circular dependency was found, so the courses cannot all be finished. Answer: false.', null, null, 'bad');
  } else {
    emit('DONE', 'canFinish: true', 'Every course cleared with no circular dependency, so all courses can be finished. Answer: true.', null, null, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<CSState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        canFinish? <span className="font-mono text-ink">{s.done ? (s.canFinish ? 'true' : 'false') : '…'}</span>
      </div>
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
    </div>
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

export const simulator: DpSimulator = {
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
