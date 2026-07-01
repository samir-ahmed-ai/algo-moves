/** Normalize a line for comparison (trim whitespace). */
function norm(line: string): string {
  return line.trim();
}

function linesWithoutTrailingBlanks(source: string): string[] {
  const lines = source.split('\n');
  let end = lines.length;
  while (end > 0 && norm(lines[end - 1]) === '') end--;
  return lines.slice(0, end);
}

export interface DiffLines {
  /** 1-based line numbers in reference that differ or are unmatched. */
  reference: Set<number>;
  /** 1-based line numbers in draft that differ or are unmatched. */
  draft: Set<number>;
}

interface AlignOp {
  type: 'match' | 'ref' | 'draft';
  refIdx?: number;
  draftIdx?: number;
}

/** Build LCS alignment ops between normalized line arrays. */
function alignLines(refLines: string[], draftLines: string[]): AlignOp[] {
  const a = refLines.map(norm);
  const b = draftLines.map(norm);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: AlignOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'match', refIdx: i, draftIdx: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'ref', refIdx: i });
      i++;
    } else {
      ops.push({ type: 'draft', draftIdx: j });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: 'ref', refIdx: i });
    i++;
  }
  while (j < m) {
    ops.push({ type: 'draft', draftIdx: j });
    j++;
  }
  return ops;
}

/** LCS-based diff: returns 1-based line numbers that differ in each file. */
export function diffChangedLines(reference: string, draft: string): DiffLines {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  const ops = alignLines(refLines, draftLines);

  const referenceChanged = new Set<number>();
  const draftChanged = new Set<number>();

  for (const op of ops) {
    if (op.type === 'match') continue;
    if (op.type === 'ref' && op.refIdx !== undefined) referenceChanged.add(op.refIdx + 1);
    if (op.type === 'draft' && op.draftIdx !== undefined) draftChanged.add(op.draftIdx + 1);
  }

  return { reference: referenceChanged, draft: draftChanged };
}

/** Similarity score 0–100 based on LCS-aligned matching lines. */
export function matchScore(reference: string, draft: string): number {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  const ops = alignLines(refLines, draftLines);
  const max = Math.max(refLines.length, draftLines.length);
  if (max === 0) return 100;

  let match = 0;
  for (const op of ops) {
    if (op.type === 'match') match++;
  }
  return Math.round((match / max) * 100);
}
