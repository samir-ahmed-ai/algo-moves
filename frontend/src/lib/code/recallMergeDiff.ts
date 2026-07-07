import { Change } from '@codemirror/merge';
import { diffArrays } from 'diff';
import { linesWithoutTrailingBlanks, normLine } from './codeDiff';

/** A single jsdiff hunk (normalized to the fields we care about). */
interface RawChunk {
  value: string[];
  added?: boolean;
  removed?: boolean;
}

/** Coalesced alignment chunk: how many reference vs draft lines this block spans. */
interface AlignChunk {
  refCount: number;
  draftCount: number;
  /** false = equal region (no highlight), true = added/removed/replaced. */
  changed: boolean;
}

/** Structural lines too generic to serve as a diff anchor on their own. */
const TRIVIAL_ANCHOR_LINES = new Set([
  'return',
  'break',
  'continue',
  'else',
  'else {',
  '} else {',
  '} else',
  'default:',
  'fallthrough',
  'pass',
]);

/** Longest trivial "unchanged" run we are willing to demote. */
const TRIVIAL_ANCHOR_MAX_RUN = 2;
/** Minimum reference-only gap that flags an adjacent trivial match as spurious. */
const LARGE_REMOVED_MIN = 3;

/**
 * A line generic enough that matching it alone (e.g. a bare `return` or `}`) should not
 * anchor the two panes together across a large gap. Values here are already trimmed.
 */
function isTrivialAnchorLine(line: string): boolean {
  const t = line.trim();
  if (t.length <= 2) return true; // `}`, `{`, `})`, `};`, `),`, ...
  return TRIVIAL_ANCHOR_LINES.has(t);
}

function isLargeRemoved(chunk: RawChunk | undefined): boolean {
  return !!chunk && !!chunk.removed && !chunk.added && chunk.value.length >= LARGE_REMOVED_MIN;
}

/**
 * When the draft is a short in-progress attempt, a lone generic line (`return`, `}`) can
 * be matched by the LCS to an identical line deep inside the reference. That spurious
 * anchor forces every reference line in between to align as a big removed block, which the
 * MergeView renders as a tall spacer gap right before the typed line. Demote such isolated
 * trivial matches back into a removed + added pair so they get folded into the surrounding
 * changed block instead of anchoring across the gap.
 */
function demoteSpuriousAnchors(changes: RawChunk[]): RawChunk[] {
  const out: RawChunk[] = [];
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]!;
    const isEqual = !c.added && !c.removed;
    if (
      isEqual &&
      c.value.length <= TRIVIAL_ANCHOR_MAX_RUN &&
      c.value.every(isTrivialAnchorLine) &&
      (isLargeRemoved(changes[i - 1]) || isLargeRemoved(changes[i + 1]))
    ) {
      out.push({ value: c.value, removed: true });
      out.push({ value: c.value, added: true });
      continue;
    }
    out.push(c);
  }
  return out;
}

/**
 * Collapse the demoted change list into alignment chunks, coalescing consecutive
 * added/removed hunks into a single "replace" so the MergeView pads the height
 * difference at the end of the block (keeping typed lines near where they were typed)
 * rather than inserting a spacer before them.
 */
function buildAlignChunks(changes: RawChunk[]): AlignChunk[] {
  const demoted = demoteSpuriousAnchors(changes);
  const chunks: AlignChunk[] = [];
  let i = 0;
  while (i < demoted.length) {
    const c = demoted[i]!;
    if (!c.added && !c.removed) {
      chunks.push({ refCount: c.value.length, draftCount: c.value.length, changed: false });
      i++;
      continue;
    }
    let refCount = 0;
    let draftCount = 0;
    while (i < demoted.length && (demoted[i]!.added || demoted[i]!.removed)) {
      const d = demoted[i]!;
      if (d.removed) refCount += d.value.length;
      if (d.added) draftCount += d.value.length;
      i++;
    }
    chunks.push({ refCount, draftCount, changed: true });
  }
  return chunks;
}

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
  const chunks = buildAlignChunks(diffArrays(refNorm, draftNorm));

  const refRanges = lineCharRanges(a, refLines.length);
  const draftRanges = lineCharRanges(b, draftLines.length);
  const out: Change[] = [];

  let refIdx = 0;
  let draftIdx = 0;

  for (const chunk of chunks) {
    const { refCount, draftCount, changed } = chunk;
    if (!changed) {
      refIdx += refCount;
      draftIdx += draftCount;
      continue;
    }

    const fromA = refCount > 0 ? (refRanges[refIdx]?.from ?? 0) : posAtLine(refRanges, refIdx);
    const toA = refCount > 0 ? (refRanges[refIdx + refCount - 1]?.to ?? fromA) : fromA;
    const fromB =
      draftCount > 0 ? (draftRanges[draftIdx]?.from ?? 0) : posAtLine(draftRanges, draftIdx);
    const toB = draftCount > 0 ? (draftRanges[draftIdx + draftCount - 1]?.to ?? fromB) : fromB;

    const [cFromA, cToA] = clampRange(fromA, toA, a.length);
    const [cFromB, cToB] = clampRange(fromB, toB, b.length);
    out.push(new Change(cFromA, cToA, cFromB, cToB));

    refIdx += refCount;
    draftIdx += draftCount;
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
