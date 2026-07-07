/**
 * Pure N-Queens backtracking engine for the Queens Court dojo game.
 * The player fills rows top-to-bottom: the active row is the first row
 * without a queen; placing, rejecting, undoing and dead-end detection all
 * live here so the React layer stays a thin shell.
 */

export type Cell = [number, number];

export interface QueensLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  n: number;
  par: number;
  blocked?: Cell[];
  prePlaced?: Cell[];
}

export interface QueensState {
  level: QueensLevel;
  /** Placed queens in order; pre-placed queens come first and cannot be undone. */
  queens: Cell[];
}

export const LEVELS: QueensLevel[] = [
  {
    id: 'bt-01',
    title: 'Four queens',
    objective: 'Place 4 queens so none attack each other.',
    lesson:
      'A queen strikes along her row, her column, and both diagonals — the tinted squares show every threatened cell. Work one row at a time: pick a column, and when a later row runs out of room, undo with u and try the next column. That try–fail–undo loop is backtracking.',
    n: 4,
    par: 6,
  },
  {
    id: 'bt-02',
    title: 'Five queens',
    objective: 'Five queens, five rows — no two may ever meet.',
    lesson:
      'Every row is a choice point. When you backtrack into a row, the cursor returns to the column you just removed — keep moving right, because you already proved the earlier columns fail. Remembering which choices you exhausted is half the algorithm.',
    n: 5,
    par: 7,
  },
  {
    id: 'bt-03',
    title: 'Six queens',
    objective: 'Fill all six rows with queens at peace.',
    lesson:
      'Six queens has only four solutions, so dead ends multiply. Watch how the threatened squares pile up: the earlier you admit a branch is doomed and backtrack, the less work you throw away. Backtracking late means undoing more.',
    n: 6,
    par: 12,
  },
  {
    id: 'bt-04',
    title: 'Cursed court',
    objective: 'Solve the court around the cursed ✕ square.',
    lesson:
      'One square is cursed — no queen may stand there. The opening that solved the last level now collapses, so scan the whole row before you commit. Constraints prune the search tree: a dead end you foresee is a dead end you never have to visit.',
    n: 6,
    par: 14,
    blocked: [[1, 3]],
  },
  {
    id: 'bt-05',
    title: 'Eight queens',
    objective: 'The classic: eight queens on a full board.',
    lesson:
      'This exact loop — place, hit a dead end, backtrack, try the next column — is the entire backtracking algorithm. A computer just runs it relentlessly; pruning doomed branches early is what turns brute force into something fast.',
    n: 8,
    par: 16,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): QueensLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function createState(level: QueensLevel): QueensState {
  return { level, queens: (level.prePlaced ?? []).map(([r, c]) => [r, c] as Cell) };
}

export function isAttacked(queens: readonly Cell[], r: number, c: number): boolean {
  return findAttacker(queens, r, c) !== undefined;
}

export function findAttacker(queens: readonly Cell[], r: number, c: number): Cell | undefined {
  return queens.find(([qr, qc]) => qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c));
}

export function isBlockedCell(level: QueensLevel, r: number, c: number): boolean {
  return (level.blocked ?? []).some(([br, bc]) => br === r && bc === c);
}

/** First row without a queen (rows fill top-to-bottom), or null when full. */
export function activeRow(state: QueensState): number | null {
  for (let r = 0; r < state.level.n; r++) {
    if (!state.queens.some(([qr]) => qr === r)) return r;
  }
  return null;
}

export function safeColumns(
  queens: readonly Cell[],
  row: number,
  n: number,
  blocked?: Cell[],
): number[] {
  const cols: number[] = [];
  for (let c = 0; c < n; c++) {
    if (blocked?.some(([br, bc]) => br === row && bc === c)) continue;
    if (!isAttacked(queens, row, c)) cols.push(c);
  }
  return cols;
}

export function isDeadEnd(state: QueensState): boolean {
  const row = activeRow(state);
  if (row === null) return false;
  return safeColumns(state.queens, row, state.level.n, state.level.blocked).length === 0;
}

export type PlaceResult =
  | { ok: true; state: QueensState; row: number }
  | { ok: false; reason: 'complete' | 'blocked' | 'attacked'; attacker?: Cell };

export function placeQueen(state: QueensState, col: number): PlaceResult {
  const row = activeRow(state);
  if (row === null) return { ok: false, reason: 'complete' };
  if (isBlockedCell(state.level, row, col)) return { ok: false, reason: 'blocked' };
  const attacker = findAttacker(state.queens, row, col);
  if (attacker) return { ok: false, reason: 'attacked', attacker };
  return { ok: true, state: { ...state, queens: [...state.queens, [row, col]] }, row };
}

export type UndoResult =
  { ok: true; state: QueensState; removed: Cell } | { ok: false; reason: 'empty' | 'prePlaced' };

export function undoQueen(state: QueensState): UndoResult {
  const preCount = state.level.prePlaced?.length ?? 0;
  if (state.queens.length === 0) return { ok: false, reason: 'empty' };
  if (state.queens.length <= preCount) return { ok: false, reason: 'prePlaced' };
  const removed = state.queens[state.queens.length - 1]!;
  return { ok: true, state: { ...state, queens: state.queens.slice(0, -1) }, removed };
}

export function isComplete(state: QueensState): boolean {
  return activeRow(state) === null;
}
