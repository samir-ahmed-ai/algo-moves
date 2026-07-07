import type { CodePiece } from './codePieces';

export function dedentForDisplay(code: string): string {
  const lines = code.split('\n');
  const nonempty = lines.filter((l) => l.trim().length > 0);
  if (nonempty.length === 0) return code;
  const minIndent = Math.min(...nonempty.map((l) => l.match(/^(\s*)/)?.[1].length ?? 0));
  if (minIndent <= 0) return code;
  return lines.map((l) => (l.trim().length > 0 ? l.slice(minIndent) : '')).join('\n');
}

/** Rough row count for masonry packing (includes wrapped long lines). */
export function estimatePieceRows(code: string, wrapCols = 32): number {
  return code
    .split('\n')
    .reduce((rows, line) => rows + Math.max(1, Math.ceil(line.length / wrapCols)), 0);
}

export interface TrayLayoutItem {
  piece: CodePiece;
  index: number;
}

/** Pack tray blocks into balanced columns by estimated height. */
export function balanceTrayColumns(
  pieces: CodePiece[],
  columnCount = 2,
  wrapCols = 32,
): TrayLayoutItem[][] {
  const cols: TrayLayoutItem[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array.from({ length: columnCount }, () => 0);
  if (pieces.length === 0) return cols;

  const ranked = pieces
    .map((piece, index) => ({ piece, index, rows: estimatePieceRows(piece.code, wrapCols) }))
    .sort((a, b) => b.rows - a.rows || a.index - b.index);

  for (const item of ranked) {
    let target = 0;
    for (let c = 1; c < columnCount; c++) {
      if (heights[c] < heights[target]) target = c;
    }
    cols[target].push({ piece: item.piece, index: item.index });
    heights[target] += item.rows;
  }

  return cols;
}
