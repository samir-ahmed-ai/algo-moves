import { Change } from '@codemirror/merge';
import { diffArrays } from 'diff';
import { linesWithoutTrailingBlanks, normLine } from './codeDiff';

/** Character ranges for each line index in a source string (includes trailing newline). */
function lineCharRanges(source: string, lineCount: number): Array<{ from: number; to: number }> {
  const allLines = source.split('\n');
  const ranges: Array<{ from: number; to: number }> = [];
  let pos = 0;
  for (let i = 0; i < lineCount; i++) {
    const from = pos;
    const line = allLines[i] ?? '';
    pos += line.length;
    if (i < allLines.length - 1) pos += 1;
    ranges.push({ from, to: pos });
  }
  return ranges;
}

function posAtLine(ranges: Array<{ from: number; to: number }>, lineIdx: number): number {
  if (lineIdx <= 0) return 0;
  if (lineIdx >= ranges.length) {
    const last = ranges[ranges.length - 1];
    return last?.to ?? 0;
  }
  return ranges[lineIdx]?.from ?? 0;
}

function clampRange(from: number, to: number, docLen: number): [number, number] {
  const safeFrom = Math.max(0, Math.min(from, docLen));
  const safeTo = Math.max(safeFrom, Math.min(to, docLen));
  return [safeFrom, safeTo];
}

/**
 * Line-based merge diff for recall mode: compares trimmed lines so leading/trailing
 * whitespace on a line does not produce highlights. Tab vs space indentation also
 * matches after trim (aligned with matchScore).
 */
export function recallMergeDiff(a: string, b: string): Change[] {
  const refLines = linesWithoutTrailingBlanks(a);
  const draftLines = linesWithoutTrailingBlanks(b);
  const refNorm = refLines.map(normLine);
  const draftNorm = draftLines.map(normLine);
  const changes = diffArrays(refNorm, draftNorm);

  const refRanges = lineCharRanges(a, refLines.length);
  const draftRanges = lineCharRanges(b, draftLines.length);
  const out: Change[] = [];

  let refIdx = 0;
  let draftIdx = 0;

  for (const change of changes) {
    const count = change.value.length;
    if (!change.added && !change.removed) {
      refIdx += count;
      draftIdx += count;
      continue;
    }

    if (change.removed && !change.added) {
      const fromA = refRanges[refIdx]?.from ?? 0;
      const toA = refRanges[refIdx + count - 1]?.to ?? fromA;
      const posB = posAtLine(draftRanges, draftIdx);
      const [cFromA, cToA] = clampRange(fromA, toA, a.length);
      const [cPosB] = clampRange(posB, posB, b.length);
      out.push(new Change(cFromA, cToA, cPosB, cPosB));
      refIdx += count;
    } else if (change.added && !change.removed) {
      const posA = posAtLine(refRanges, refIdx);
      const fromB = draftRanges[draftIdx]?.from ?? 0;
      const toB = draftRanges[draftIdx + count - 1]?.to ?? fromB;
      const [cPosA] = clampRange(posA, posA, a.length);
      const [cFromB, cToB] = clampRange(fromB, toB, b.length);
      out.push(new Change(cPosA, cPosA, cFromB, cToB));
      draftIdx += count;
    } else {
      const fromA = refRanges[refIdx]?.from ?? 0;
      const toA = refRanges[refIdx + count - 1]?.to ?? fromA;
      const fromB = draftRanges[draftIdx]?.from ?? 0;
      const toB = draftRanges[draftIdx + count - 1]?.to ?? fromB;
      const [cFromA, cToA] = clampRange(fromA, toA, a.length);
      const [cFromB, cToB] = clampRange(fromB, toB, b.length);
      out.push(new Change(cFromA, cToA, cFromB, cToB));
      refIdx += count;
      draftIdx += count;
    }
  }

  return out;
}

/** diffConfig for MergeView — trim-per-line comparison aligned with matchScore. */
export const recallMergeDiffConfig = { override: recallMergeDiff };

export interface RecallMergeViewOptions {
  highlightChanges?: boolean;
  mergeGutter?: boolean;
  mergeCollapse?: boolean;
}

/** MergeView.reconfigure payload — always keeps recall trim diff enabled. */
export function buildRecallMergeReconfigure({
  highlightChanges = true,
  mergeGutter = true,
  mergeCollapse = true,
}: RecallMergeViewOptions = {}) {
  return {
    highlightChanges,
    gutter: mergeGutter,
    diffConfig: recallMergeDiffConfig,
    ...(mergeCollapse ? { collapseUnchanged: { margin: 3, minSize: 4 } } : {}),
  };
}
