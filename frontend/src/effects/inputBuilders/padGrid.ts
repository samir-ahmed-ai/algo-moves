export type ColumnModifier = 'none' | 'repeat' | 'slow' | 'fast' | 'euclid';

export interface PadGridState {
  rows: number;
  cols: number;
  cells: boolean[][];
  columnModifiers: Record<number, ColumnModifier>;
  selected: Set<string>;
}

export function createPadGrid(rows = 4, cols = 8): PadGridState {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => false)),
    columnModifiers: {},
    selected: new Set(),
  };
}

export function toggleCell(
  state: PadGridState,
  row: number,
  col: number,
  shiftKey = false,
): PadGridState {
  const key = `${row},${col}`;
  const cells = state.cells.map((r, ri) => r.map((c, ci) => (ri === row && ci === col ? !c : c)));
  const selected = new Set(state.selected);
  if (shiftKey) {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
  } else {
    selected.clear();
    if (cells[row][col]) selected.add(key);
  }
  return { ...state, cells, selected };
}

/** Convert pad grid to a flat number array (active cells → 1, inactive → 0, row-major). */
export function padGridToArray(state: PadGridState): number[] {
  const out: number[] = [];
  for (let c = 0; c < state.cols; c++) {
    let colValues: number[] = [];
    for (let r = 0; r < state.rows; r++) {
      if (state.cells[r][c]) colValues.push(r + 1);
    }
    const mod = state.columnModifiers[c] ?? 'none';
    if (mod === 'repeat' && colValues.length) {
      colValues = [...colValues, ...colValues];
    } else if (mod === 'euclid' && colValues.length === 0) {
      colValues = euclideanPattern(state.rows, (c % 3) + 2, (c % 5) + 3);
    }
    out.push(...colValues);
  }
  return out.length ? out : state.cells.flat().map((v) => (v ? 1 : 0));
}

function euclideanPattern(steps: number, pulses: number, rotation: number): number[] {
  const pattern: number[] = [];
  for (let i = 0; i < steps; i++) {
    if (
      Math.floor(((i + rotation) * pulses) / steps) !==
      Math.floor(((i + rotation - 1) * pulses) / steps)
    ) {
      pattern.push(i + 1);
    }
  }
  return pattern;
}

export const EUCLIDEAN_PRESETS = [
  { label: '3:2', pulses: 3, steps: 5 },
  { label: '4:3', pulses: 4, steps: 7 },
  { label: '5:3', pulses: 5, steps: 8 },
];
