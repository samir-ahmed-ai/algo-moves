import { linesWithoutTrailingBlanks, normLine } from './codeDiff';

/** Strict line-by-line recall: reset to `resetTo` (empty by default) on any mistake. */
export function strictRecallDraft(reference: string, draft: string, resetTo = ''): string {
  if (draft === resetTo) return draft;

  const refLines = linesWithoutTrailingBlanks(reference).map(normLine);
  const draftLines = linesWithoutTrailingBlanks(draft).map(normLine);

  if (draftLines.length > refLines.length) return resetTo;

  for (let i = 0; i < draftLines.length; i++) {
    const d = draftLines[i];
    const r = refLines[i];
    if (i < draftLines.length - 1) {
      if (d !== r) return resetTo;
    } else if (!r.startsWith(d)) {
      return resetTo;
    }
  }

  return draft;
}
