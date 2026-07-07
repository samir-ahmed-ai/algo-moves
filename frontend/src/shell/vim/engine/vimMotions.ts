export type Pos = [number, number];

export type VimMotionKind =
  | 'h'
  | 'j'
  | 'k'
  | 'l'
  | 'w'
  | 'b'
  | 'e'
  | '0'
  | '$'
  | '^'
  | 'f'
  | 'F'
  | 't'
  | 'T'
  | 'gg'
  | 'G'
  | 'nG';

export interface MotionSpec {
  kind: VimMotionKind;
  char?: string;
  count: number;
}

export type MazeGrid = readonly string[];

export function isWalkable(grid: MazeGrid, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r >= grid.length) return false;
  const row = grid[r];
  if (!row || c >= row.length) return false;
  const ch = row[c];
  return ch !== '#' && ch !== undefined;
}

function cols(grid: MazeGrid): number {
  return grid.reduce((m, row) => Math.max(m, row.length), 0);
}

function moveDir(grid: MazeGrid, [r, c]: Pos, dr: number, dc: number, count: number): Pos | null {
  let nr = r;
  let nc = c;
  for (let i = 0; i < count; i++) {
    const tr = nr + dr;
    const tc = nc + dc;
    if (!isWalkable(grid, tr, tc)) return null;
    nr = tr;
    nc = tc;
  }
  return [nr, nc];
}

function wordStartsOnRow(grid: MazeGrid, row: number): number[] {
  const starts: number[] = [];
  let inWord = false;
  for (let c = 0; c < cols(grid); c++) {
    const walk = isWalkable(grid, row, c);
    if (walk && !inWord) starts.push(c);
    inWord = walk;
  }
  return starts;
}

function wordEndsOnRow(grid: MazeGrid, row: number): number[] {
  const ends: number[] = [];
  let inWord = false;
  for (let c = 0; c < cols(grid); c++) {
    const walk = isWalkable(grid, row, c);
    if (walk && !inWord) inWord = true;
    if (inWord && (!walk || c === cols(grid) - 1)) {
      if (walk) ends.push(c);
      else if (c > 0 && isWalkable(grid, row, c - 1)) ends.push(c - 1);
      inWord = false;
    }
  }
  return ends;
}

function firstWalkableOnRow(grid: MazeGrid, row: number): number | null {
  for (let c = 0; c < cols(grid); c++) {
    if (isWalkable(grid, row, c)) return c;
  }
  return null;
}

function lastWalkableOnRow(grid: MazeGrid, row: number): number | null {
  for (let c = cols(grid) - 1; c >= 0; c--) {
    if (isWalkable(grid, row, c)) return c;
  }
  return null;
}

function firstWalkableInGrid(grid: MazeGrid): Pos | null {
  for (let r = 0; r < grid.length; r++) {
    const c = firstWalkableOnRow(grid, r);
    if (c !== null) return [r, c];
  }
  return null;
}

function lastWalkableInGrid(grid: MazeGrid): Pos | null {
  for (let r = grid.length - 1; r >= 0; r--) {
    const c = lastWalkableOnRow(grid, r);
    if (c !== null) return [r, c];
  }
  return null;
}

function nearestWalkableOnRow(grid: MazeGrid, row: number, col: number): Pos | null {
  if (isWalkable(grid, row, col)) return [row, col];
  for (let d = 1; d < cols(grid); d++) {
    if (isWalkable(grid, row, col - d)) return [row, col - d];
    if (isWalkable(grid, row, col + d)) return [row, col + d];
  }
  return null;
}

function motionW(grid: MazeGrid, [r, c]: Pos): Pos | null {
  const starts = wordStartsOnRow(grid, r);
  const nextOnRow = starts.find((s) => s > c);
  if (nextOnRow !== undefined) return [r, nextOnRow];
  for (let nr = r + 1; nr < grid.length; nr++) {
    const ns = wordStartsOnRow(grid, nr);
    if (ns.length) return [nr, ns[0]!];
  }
  return null;
}

function motionB(grid: MazeGrid, [r, c]: Pos): Pos | null {
  const starts = wordStartsOnRow(grid, r);
  const prevOnRow = [...starts].reverse().find((s) => s < c);
  if (prevOnRow !== undefined) return [r, prevOnRow];
  for (let nr = r - 1; nr >= 0; nr--) {
    const ns = wordStartsOnRow(grid, nr);
    if (ns.length) return [nr, ns[ns.length - 1]!];
  }
  return null;
}

function motionE(grid: MazeGrid, [r, c]: Pos): Pos | null {
  const ends = wordEndsOnRow(grid, r);
  const nextEnd = ends.find((e) => e > c);
  if (nextEnd !== undefined) return [r, nextEnd];
  for (let nr = r + 1; nr < grid.length; nr++) {
    const ne = wordEndsOnRow(grid, nr);
    if (ne.length) return [nr, ne[0]!];
  }
  return null;
}

function cellChar(grid: MazeGrid, r: number, c: number): string {
  return grid[r]?.[c] ?? '#';
}

function findOnRow(
  grid: MazeGrid,
  row: number,
  fromCol: number,
  char: string,
  forward: boolean,
): number | null {
  if (forward) {
    for (let c = fromCol + 1; c < cols(grid); c++) {
      if (isWalkable(grid, row, c) && cellChar(grid, row, c).toLowerCase() === char.toLowerCase())
        return c;
    }
  } else {
    for (let c = fromCol - 1; c >= 0; c--) {
      if (isWalkable(grid, row, c) && cellChar(grid, row, c).toLowerCase() === char.toLowerCase())
        return c;
    }
  }
  return null;
}

function motionFind(
  grid: MazeGrid,
  pos: Pos,
  char: string,
  mode: 'f' | 'F' | 't' | 'T',
): Pos | null {
  const [r, c] = pos;
  if (mode === 'f' || mode === 't') {
    const hit = findOnRow(grid, r, c, char, true);
    if (hit === null) return null;
    if (mode === 'f') return [r, hit];
    return hit > 0 && isWalkable(grid, r, hit - 1) ? [r, hit - 1] : null;
  }
  const hit = findOnRow(grid, r, c, char, false);
  if (hit === null) return null;
  if (mode === 'F') return [r, hit];
  return hit < cols(grid) - 1 && isWalkable(grid, r, hit + 1) ? [r, hit + 1] : null;
}

function motionGG(grid: MazeGrid): Pos | null {
  return firstWalkableInGrid(grid);
}

function motionG(grid: MazeGrid, [r, c]: Pos): Pos | null {
  void r;
  const last = lastWalkableInGrid(grid);
  if (!last) return null;
  const targetRow = last[0];
  return nearestWalkableOnRow(grid, targetRow, c) ?? last;
}

function motionNG(grid: MazeGrid, [r, c]: Pos, line: number): Pos | null {
  void r;
  const targetRow = Math.max(0, Math.min(grid.length - 1, line - 1));
  return nearestWalkableOnRow(grid, targetRow, c);
}

/** Apply a Vim motion on the maze grid; returns new position or null if blocked. */
export function applyMotion(grid: MazeGrid, pos: Pos, motion: MotionSpec): Pos | null {
  const count = Math.max(1, motion.count);

  switch (motion.kind) {
    case 'h':
      return moveDir(grid, pos, 0, -1, count);
    case 'l':
      return moveDir(grid, pos, 0, 1, count);
    case 'k':
      return moveDir(grid, pos, -1, 0, count);
    case 'j':
      return moveDir(grid, pos, 1, 0, count);
    case 'w': {
      let cur = pos;
      for (let i = 0; i < count; i++) {
        const next = motionW(grid, cur);
        if (!next) return null;
        cur = next;
      }
      return cur;
    }
    case 'b': {
      let cur = pos;
      for (let i = 0; i < count; i++) {
        const next = motionB(grid, cur);
        if (!next) return null;
        cur = next;
      }
      return cur;
    }
    case 'e': {
      let cur = pos;
      for (let i = 0; i < count; i++) {
        const next = motionE(grid, cur);
        if (!next) return null;
        cur = next;
      }
      return cur;
    }
    case '0': {
      const col = firstWalkableOnRow(grid, pos[0]);
      return col !== null ? [pos[0], col] : null;
    }
    case '$': {
      const col = lastWalkableOnRow(grid, pos[0]);
      return col !== null ? [pos[0], col] : null;
    }
    case '^': {
      const col = firstWalkableOnRow(grid, pos[0]);
      return col !== null ? [pos[0], col] : null;
    }
    case 'f':
    case 'F':
    case 't':
    case 'T': {
      if (!motion.char) return null;
      let cur = pos;
      for (let i = 0; i < count; i++) {
        const next = motionFind(grid, cur, motion.char, motion.kind);
        if (!next) return null;
        cur = next;
      }
      return cur;
    }
    case 'gg':
      return motionGG(grid);
    case 'G':
      return motionG(grid, pos);
    case 'nG':
      return motionNG(grid, pos, count);
    default:
      return null;
  }
}

export function motionAllowed(kind: VimMotionKind, allowed: VimMotionKind[]): boolean {
  if (allowed.includes(kind)) return true;
  if (kind === 'nG' && allowed.includes('nG')) return true;
  return false;
}

export function motionDisplay(motion: MotionSpec): string {
  const n = motion.count > 1 ? String(motion.count) : '';
  if (motion.kind === 'gg') return 'gg';
  if (motion.kind === 'nG') return `${motion.count}G`;
  if (motion.char && ['f', 'F', 't', 'T'].includes(motion.kind)) {
    return `${n}${motion.kind}${motion.char}`;
  }
  return `${n}${motion.kind}`;
}
