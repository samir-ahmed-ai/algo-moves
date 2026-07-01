export type Mark = 'X' | 'O';
export type Board = (Mark | null)[];

/** All eight winning triples: 3 rows, 3 columns, 2 diagonals. */
export const WIN_LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The winning mark if a line is completed, else null. */
export function winner(board: Board): Mark | null {
  for (const [a, b, c] of WIN_LINES) {
    const mark = board[a];
    if (mark && board[b] === mark && board[c] === mark) return mark;
  }
  return null;
}

/** True once every cell is filled. */
export function isFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

/** Whose turn it is: even fill count -> X (host first), odd -> O. */
export function currentMark(board: Board): Mark {
  const filled = board.reduce((n, cell) => (cell ? n + 1 : n), 0);
  return filled % 2 === 0 ? 'X' : 'O';
}

/** A fresh, empty board. */
export function emptyBoard(): Board {
  return Array<Mark | null>(9).fill(null);
}
