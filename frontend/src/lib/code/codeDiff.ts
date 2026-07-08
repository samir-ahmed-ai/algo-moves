import { diffArrays } from 'diff';

/**
 * Normalize a line for comparison. Drops a trailing `\r` (so CRLF vs LF never differs) and,
 * when `ignoreWhitespace` is true (the default), also trims leading/trailing whitespace so
 * indentation and tab-vs-space differences don't register as changes. Pass `false` for a
 * whitespace-sensitive comparison.
 */
export function normLine(line: string, ignoreWhitespace = true): string {
  const withoutCr = line.endsWith('\r') ? line.slice(0, -1) : line;
  return ignoreWhitespace ? withoutCr.trim() : withoutCr;
}

export function linesWithoutTrailingBlanks(source: string): string[] {
  const lines = source.split('\n');
  let end = lines.length;
  // Trailing blank lines at end-of-file are always noise, regardless of whitespace mode.
  while (end > 0 && normLine(lines[end - 1] ?? '', true) === '') end--;
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
  ignoreWhitespace = true,
): { reference: Set<number>; draft: Set<number> } {
  const refNorm = refLines.map((l) => normLine(l, ignoreWhitespace));
  const draftNorm = draftLines.map((l) => normLine(l, ignoreWhitespace));
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
export function diffChangedLines(
  reference: string,
  draft: string,
  ignoreWhitespace = true,
): DiffLines {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  return collectLineDiff(refLines, draftLines, ignoreWhitespace);
}

/** Similarity score 0–100 based on aligned matching lines. */
export function matchScore(reference: string, draft: string, ignoreWhitespace = true): number {
  const refLines = linesWithoutTrailingBlanks(reference);
  const draftLines = linesWithoutTrailingBlanks(draft);
  const refNorm = refLines.map((l) => normLine(l, ignoreWhitespace));
  const draftNorm = draftLines.map((l) => normLine(l, ignoreWhitespace));
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
 * Recall progress: which reference lines the `draft` has confirmed, the line in progress,
 * and how much of it matches. Intended to pair with `strictRecallDraft` (which guarantees a
 * verified correct prefix), but hardened to be safe on any input — it validates each
 * supposedly-completed line against the reference and never reports progress past the end of
 * the reference, so an over-typed or divergent draft can't produce phantom "completed" lines
 * or a bogus matched prefix.
 */
export function computeRecallProgress(
  reference: string,
  draft: string,
  ignoreWhitespace = true,
): RecallProgress {
  const refNorm = linesWithoutTrailingBlanks(reference).map((l) => normLine(l, ignoreWhitespace));
  const draftNorm = linesWithoutTrailingBlanks(draft).map((l) => normLine(l, ignoreWhitespace));
  const total = refNorm.length;

  if (draftNorm.length === 0) {
    return { completedLines: [], currentLine: total > 0 ? 1 : null, matchedPrefixLen: 0, total };
  }

  const lastIdx = draftNorm.length - 1;
  const completedLines: number[] = [];

  // Every finished (non-last) draft line must exactly match its reference counterpart to
  // count as completed. The first divergence — or running past the end of the reference —
  // stops progress at that line.
  for (let i = 0; i < lastIdx; i++) {
    if (i < total && draftNorm[i] === refNorm[i]) {
      completedLines.push(i + 1);
      continue;
    }
    return {
      completedLines,
      currentLine: i < total ? i + 1 : null,
      matchedPrefixLen: 0,
      total,
    };
  }

  const lastDraftNorm = draftNorm[lastIdx] ?? '';
  const withinRef = lastIdx < total;
  const lastLineComplete =
    withinRef && lastDraftNorm.length > 0 && lastDraftNorm === refNorm[lastIdx];

  if (lastLineComplete) {
    completedLines.push(lastIdx + 1);
    const nextLine = lastIdx + 2;
    return {
      completedLines,
      currentLine: nextLine <= total ? nextLine : null,
      matchedPrefixLen: 0,
      total,
    };
  }

  // Last line is in progress; a matched prefix is only meaningful within the reference.
  const currentLine = withinRef ? lastIdx + 1 : null;
  return {
    completedLines,
    currentLine,
    matchedPrefixLen: currentLine !== null ? lastDraftNorm.length : 0,
    total,
  };
}
