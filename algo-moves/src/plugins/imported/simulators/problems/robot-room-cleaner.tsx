import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RobotInput {
  // 1 = open, 0 = wall. The robot starts at `start` facing up (dir 0).
  room: number[][];
  start: [number, number];
}

interface RobotState {
  room: number[][];
  cleaned: boolean[][]; // cells the robot has cleaned (visited)
  pos: [number, number]; // current robot cell
  dir: number; // 0=up,1=right,2=down,3=left
  count: number; // cells cleaned so far
  done: boolean;
}

// Facing order matches the reference Go solution: {-1,0},{0,1},{1,0},{0,-1}
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], // up
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
];
const ARROW = ['↑', '→', '↓', '←'];

function record({ room, start }: RobotInput): Frame<RobotState>[] {
  const m = room.length;
  const n = room[0].length;
  const cleaned = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
  const frames: Frame<RobotState>[] = [];

  // Robot's true position/facing in the room — the algorithm only knows relative moves.
  let pos: [number, number] = [start[0], start[1]];
  let dir = 0;
  let count = 0;

  const emit = (type: string, note: string, caption: string, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        room,
        cleaned: cleaned.map((r) => r.slice()),
        pos: [pos[0], pos[1]],
        dir,
        count,
        done: type === 'DONE',
      },
    });

  // Robot primitives the algorithm is allowed to use.
  const turnRight = () => {
    dir = (dir + 1) % 4;
  };
  const move = (): boolean => {
    const nr = pos[0] + DIRS[dir][0];
    const nc = pos[1] + DIRS[dir][1];
    if (nr < 0 || nr >= m || nc < 0 || nc >= n || room[nr][nc] === 0) return false;
    pos = [nr, nc];
    return true;
  };

  emit(
    'INIT',
    `${m}×${n} room`,
    `Robot Room Cleaner: the robot starts facing up and can only move forward, turn, and clean — it never sees the whole room. DFS with backtracking visits every reachable open cell exactly once, using relative coordinates to remember where it has been.`,
  );

  // Visited set keyed by relative coordinates, exactly like the reference solution.
  const vis = new Set<string>();

  const dfs = (r: number, c: number, d: number) => {
    vis.add(`${r},${c}`);
    cleaned[r][c] = true;
    count++;
    emit('CLEAN', `clean (${r},${c})`, `Clean cell (${r}, ${c}) and mark it visited. Cells cleaned so far: ${count}. Now try each of the 4 directions from here.`);

    for (let i = 0; i < 4; i++) {
      const nd = (d + i) % 4;
      const nr = r + DIRS[nd][0];
      const nc = c + DIRS[nd][1];
      const key = `${nr},${nc}`;
      if (!vis.has(key)) {
        // Aim the robot at direction nd, then probe with a real move.
        while (dir !== nd) turnRight();
        if (move()) {
          emit('MOVE', `move ${ARROW[nd]}`, `From (${r}, ${c}) the robot faces ${ARROW[nd]} and moves into the open cell (${nr}, ${nc}) — recurse into it.`);
          dfs(nr, nc, nd);
          // Backtrack: turn around, step back to (r,c), restore facing.
          turnRight();
          turnRight();
          move();
          turnRight();
          turnRight();
          emit('BACKTRACK', `back to (${r},${c})`, `Done exploring from (${nr}, ${nc}); backtrack — turn around, step back to (${r}, ${c}), and turn around again to restore facing.`);
        } else {
          emit('WALL', `wall ${ARROW[nd]}`, `Facing ${ARROW[nd]} from (${r}, ${c}) hits a wall (or the room edge) — can't move, skip this direction.`);
        }
      }
      // Rotate to scan the next relative direction.
      turnRight();
    }
  };

  dfs(start[0], start[1], 0);

  emit('DONE', `${count} cells cleaned`, `Every reachable open cell has been visited and cleaned. Total cells cleaned = ${count}.`, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RobotState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (s.pos[0] === r && s.pos[1] === c) return 'active';
    if (s.room[r][c] === 0) return 'water';
    if (s.cleaned[r][c]) return 'visited';
    return 'land';
  };
  const label = (r: number, c: number) => {
    if (s.pos[0] === r && s.pos[1] === c) return ARROW[s.dir];
    if (s.room[r][c] === 0) return '▧';
    return s.cleaned[r][c] ? '·' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        cells cleaned = <span className="font-mono text-ink">{s.count}</span> · facing{' '}
        <span className="font-mono text-ink">{ARROW[s.dir]}</span>
      </div>
      <GridBoard grid={s.room} cellTone={cellTone} label={label} active={s.pos} cellSize={44} />
      <div className={cn(vizText.sm, 'text-ink3')}>▧ wall · arrow = robot · · = cleaned</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RobotState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="position" v={`(${s.pos[0]}, ${s.pos[1]})`} />
      <InspectorRow k="facing" v={ARROW[s.dir]} />
      <InspectorRow k="cells cleaned" v={s.count} />
    </VarGrid>
  );
}

// Tiny known rooms (1 = open, 0 = wall). The robot starts at `start` facing up.
const R1: RobotInput = {
  room: [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  start: [1, 0],
};
const R2: RobotInput = {
  room: [
    [1, 1, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
  ],
  start: [2, 0],
};

export const manifestId = 'imp-13-robot-room-cleaner';
export const title = 'Robot Room Cleaner';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'r1', label: '3×3 ring · 8 open cells', value: R1 },
    { id: 'r2', label: '3×4 room · 9 open cells', value: R2 },
  ] satisfies SampleInput<RobotInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RobotState | undefined;
    return { ok: true, label: `${s ? s.count : 0} cells cleaned` };
  },
};
