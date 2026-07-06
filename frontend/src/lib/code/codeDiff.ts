/** Normalize a line for comparison (trim whitespace). */
export function normLine(line: string): string {
  return line.trim();
}

/** @deprecated use normLine */
const norm = normLine;

export function linesWithoutTrailingBlanks(source: string): string[] {
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

export interface RecallProgress {
  /** 1-based reference line numbers fully confirmed as correct. */
  completedLines: number[];
  /** 1-based reference line currently being typed, or null once every line is complete. */
  currentLine: number | null;
  /** Trimmed-character count of the current line matched so far (0 when idle/complete). */
  matchedPrefixLen: number;
  /** Total non-blank reference lines. */
  total: number;
}

/**
 * Recall progress against a `draft` known (by `strictRecallDraft`) to always be a verified,
 * line-by-line correct prefix of `reference` — so line `i` in the draft always maps to line
 * `i` in the reference. Used to drive the "recall progress" highlighter instead of a diff.
 */
export function computeRecallProgress(reference: string, draft: string): RecallProgress {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  const total = refLines.length;

  if (draftLines.length === 0) {
    return { completedLines: [], currentLine: total > 0 ? 1 : null, matchedPrefixLen: 0, total };
  }

  const lastIdx = draftLines.length - 1;
  const completedLines = Array.from({ length: Math.min(lastIdx, total) }, (_, i) => i + 1);

  const lastDraftNorm = normLine(draftLines[lastIdx]);
  const refLineForLast = lastIdx < total ? normLine(refLines[lastIdx]) : '';
  const lastLineComplete = lastIdx < total && lastDraftNorm.length > 0 && lastDraftNorm === refLineForLast;

  if (lastLineComplete) {
    completedLines.push(lastIdx + 1);
    const nextLine = lastIdx + 2;
    return { completedLines, currentLine: nextLine <= total ? nextLine : null, matchedPrefixLen: 0, total };
  }

  const currentLine = lastIdx + 1 <= total ? lastIdx + 1 : null;
  return { completedLines, currentLine, matchedPrefixLen: lastDraftNorm.length, total };
}
