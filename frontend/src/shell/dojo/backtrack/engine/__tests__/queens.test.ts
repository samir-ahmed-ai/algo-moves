import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  activeRow,
  createState,
  getLevel,
  isAttacked,
  isComplete,
  isDeadEnd,
  nextLevelId,
  placeQueen,
  safeColumns,
  undoQueen,
  type Cell,
  type QueensLevel,
  type QueensState,
} from '../queens';

/** DFS solver over the engine primitives, counting actions (placements + undos). */
function solve(level: QueensLevel): { solution: Cell[]; actions: number } | null {
  const counter = { actions: 0 };
  const dfs = (state: QueensState): QueensState | null => {
    const row = activeRow(state);
    if (row === null) return state;
    for (const col of safeColumns(state.queens, row, level.n, level.blocked)) {
      const placed = placeQueen(state, col);
      if (!placed.ok) continue;
      counter.actions += 1;
      const solved = dfs(placed.state);
      if (solved) return solved;
      counter.actions += 1;
    }
    return null;
  };
  const solved = dfs(createState(level));
  return solved ? { solution: solved.queens, actions: counter.actions } : null;
}

function stateWith(level: QueensLevel, queens: Cell[]): QueensState {
  return { level, queens };
}

const plain = (n: number): QueensLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  n,
  par: n,
});

describe('attack geometry', () => {
  it('detects row, column, and both diagonal attacks', () => {
    const queens: Cell[] = [[3, 3]];
    expect(isAttacked(queens, 3, 0)).toBe(true);
    expect(isAttacked(queens, 0, 3)).toBe(true);
    expect(isAttacked(queens, 5, 5)).toBe(true);
    expect(isAttacked(queens, 1, 5)).toBe(true);
    expect(isAttacked(queens, 5, 1)).toBe(true);
    expect(isAttacked(queens, 4, 6)).toBe(false);
    expect(isAttacked(queens, 1, 4)).toBe(false);
  });
});

describe('safeColumns', () => {
  it('narrows the classic 4×4 solution row by row', () => {
    expect(safeColumns([[0, 1]], 1, 4)).toEqual([3]);
    expect(
      safeColumns(
        [
          [0, 1],
          [1, 3],
        ],
        2,
        4,
      ),
    ).toEqual([0]);
    expect(
      safeColumns(
        [
          [0, 1],
          [1, 3],
          [2, 0],
        ],
        3,
        4,
      ),
    ).toEqual([2]);
  });

  it('excludes blocked cells', () => {
    expect(safeColumns([], 0, 4, [[0, 2]])).toEqual([0, 1, 3]);
  });
});

describe('dead-end detection', () => {
  it('flags a row with zero safe columns', () => {
    const state = stateWith(plain(4), [
      [0, 0],
      [1, 2],
    ]);
    expect(safeColumns(state.queens, 2, 4)).toEqual([]);
    expect(isDeadEnd(state)).toBe(true);
  });

  it('is not a dead end when a safe column remains or the board is full', () => {
    expect(isDeadEnd(stateWith(plain(4), [[0, 1]]))).toBe(false);
    expect(
      isDeadEnd(
        stateWith(plain(4), [
          [0, 1],
          [1, 3],
          [2, 0],
          [3, 2],
        ]),
      ),
    ).toBe(false);
  });
});

describe('placeQueen', () => {
  it('places on a safe square in the active row and advances', () => {
    const level = plain(4);
    const placed = placeQueen(createState(level), 1);
    expect(placed.ok).toBe(true);
    if (placed.ok) {
      expect(placed.row).toBe(0);
      expect(placed.state.queens).toEqual([[0, 1]]);
      expect(activeRow(placed.state)).toBe(1);
    }
  });

  it('rejects attacked squares with the attacker', () => {
    const state = stateWith(plain(4), [[0, 1]]);
    const rejected = placeQueen(state, 2);
    expect(rejected).toMatchObject({ ok: false, reason: 'attacked', attacker: [0, 1] });
    expect(state.queens).toHaveLength(1);
  });

  it('rejects blocked squares', () => {
    const level: QueensLevel = { ...plain(4), blocked: [[0, 2]] };
    expect(placeQueen(createState(level), 2)).toMatchObject({ ok: false, reason: 'blocked' });
  });
});

describe('undoQueen', () => {
  it('removes the most recent queen', () => {
    const state = stateWith(plain(4), [
      [0, 1],
      [1, 3],
    ]);
    const undone = undoQueen(state);
    expect(undone).toMatchObject({ ok: true, removed: [1, 3] });
    if (undone.ok) expect(undone.state.queens).toEqual([[0, 1]]);
  });

  it('refuses pre-placed queens and empty boards', () => {
    const level: QueensLevel = { ...plain(4), prePlaced: [[0, 1]] };
    const state = createState(level);
    expect(undoQueen(state)).toEqual({ ok: false, reason: 'prePlaced' });
    const placed = placeQueen(state, 3);
    expect(placed.ok).toBe(true);
    if (placed.ok) {
      const undone = undoQueen(placed.state);
      expect(undone).toMatchObject({ ok: true, removed: [1, 3] });
      if (undone.ok) expect(undoQueen(undone.state)).toEqual({ ok: false, reason: 'prePlaced' });
    }
    expect(undoQueen(stateWith(plain(4), []))).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['bt-01', 'bt-02', 'bt-03', 'bt-04', 'bt-05']);
    expect(getLevel('bt-04')?.n).toBe(6);
    expect(nextLevelId('bt-04')).toBe('bt-05');
    expect(nextLevelId('bt-05')).toBeNull();
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s is solvable and its par allows a perfect run',
    (_id, level) => {
      const solved = solve(level);
      expect(solved).not.toBeNull();
      const solution = solved!.solution;
      expect(new Set(solution.map(([r]) => r)).size).toBe(level.n);
      for (let i = 0; i < solution.length; i++) {
        const [r, c] = solution[i]!;
        expect(
          isAttacked(
            solution.filter((_, j) => j !== i),
            r,
            c,
          ),
        ).toBe(false);
        expect(level.blocked?.some(([br, bc]) => br === r && bc === c) ?? false).toBe(false);
      }
      const placementsNeeded = level.n - (level.prePlaced?.length ?? 0);
      expect(placementsNeeded).toBeLessThanOrEqual(level.par);
      expect(isComplete(stateWith(level, solution))).toBe(true);
    },
  );

  it('bt-04 curses the classic six-queens opening but stays solvable', () => {
    const cursed = getLevel('bt-04')!;
    const classicFirst: Cell[] = [
      [0, 1],
      [1, 3],
      [2, 5],
      [3, 0],
      [4, 2],
      [5, 4],
    ];
    let state = createState(cursed);
    let broke = false;
    for (const [, col] of classicFirst) {
      const placed = placeQueen(state, col);
      if (!placed.ok) {
        broke = true;
        expect(placed.reason).toBe('blocked');
        break;
      }
      state = placed.state;
    }
    expect(broke).toBe(true);

    const solved = solve(cursed);
    expect(solved).not.toBeNull();
    expect(solved!.solution[0]![1]).toBeGreaterThan(1);
  });
});
