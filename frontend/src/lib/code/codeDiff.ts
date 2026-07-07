import { diffArrays } from 'diff';

/** Normalize a line for comparison (trim whitespace). */
export function normLine(line: string): string {
  return line.trim();
}

export function linesWithoutTrailingBlanks(source: string): string[] {
  const lines = source.split('\n');
  let end = lines.length;
  while (end > 0 && normLine(lines[end - 1]) === '') end--;
  return lines.slice(0, end);
}

export interface DiffLines {
  /** 1-based line numbers in reference that differ or are unmatched. */
  reference: Set<number>;
  /** 1-based line numbers in draft that differ or are unmatched. */
  draft: Set<number>;
}

function collectLineDiff(
  refLines: string[],
  draftLines: string[],
): { reference: Set<number>; draft: Set<number> } {
  const refNorm = refLines.map(normLine);
  const draftNorm = draftLines.map(normLine);
  const changes = diffArrays(refNorm, draftNorm);

  const reference = new Set<number>();
  const draft = new Set<number>();
  let refIdx = 0;
  let draftIdx = 0;

  for (const change of changes) {
    const count = change.value.length;
    if (change.removed && !change.added) {
      for (let i = 0; i < count; i++) reference.add(refIdx + i + 1);
      refIdx += count;
    } else if (change.added && !change.removed) {
      for (let i = 0; i < count; i++) draft.add(draftIdx + i + 1);
      draftIdx += count;
    } else if (change.removed && change.added) {
      for (let i = 0; i < count; i++) {
        reference.add(refIdx + i + 1);
        draft.add(draftIdx + i + 1);
      }
      refIdx += count;
      draftIdx += count;
    } else {
      refIdx += count;
      draftIdx += count;
    }
  }

  return { reference, draft };
}

/** Line diff via jsdiff: returns 1-based line numbers that differ in each file. */
export function diffChangedLines(reference: string, draft: string): DiffLines {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  return collectLineDiff(refLines, draftLines);
}

/** Similarity score 0–100 based on aligned matching lines. */
export function matchScore(reference: string, draft: string): number {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  const refNorm = refLines.map(normLine);
  const draftNorm = draftLines.map(normLine);
  const changes = diffArrays(refNorm, draftNorm);
  const max = Math.max(refLines.length, draftLines.length);
  if (max === 0) return 100;

  let match = 0;
  for (const change of changes) {
    if (!change.added && !change.removed) match += change.value.length;
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
