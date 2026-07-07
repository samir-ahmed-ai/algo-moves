import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type RecallLineHeight = 'compact' | 'normal' | 'relaxed';

export const RECALL_FONT_MIN = 10;
export const RECALL_FONT_MAX = 18;
export const RECALL_FONT_DEFAULT = 13;

export const RECALL_LINE_HEIGHTS: Readonly<Record<RecallLineHeight, string>> = {
  compact: '1.35',
  normal: '1.5',
  relaxed: '1.65',
};

export function clampRecallFontSize(size: number): number {
  if (!Number.isFinite(size)) return RECALL_FONT_DEFAULT;
  return Math.min(RECALL_FONT_MAX, Math.max(RECALL_FONT_MIN, Math.round(size)));
}

export function isRecallLineHeight(value: unknown): value is RecallLineHeight {
  return value === 'compact' || value === 'normal' || value === 'relaxed';
}

export function cycleRecallLineHeight(current: RecallLineHeight): RecallLineHeight {
  switch (current) {
    case 'compact':
      return 'normal';
    case 'normal':
      return 'relaxed';
    case 'relaxed':
      return 'compact';
  }
}

export function recallLineHeightLabel(value: RecallLineHeight): string {
  switch (value) {
    case 'compact':
      return 'Tight';
    case 'relaxed':
      return 'Loose';
    case 'normal':
      return 'Normal';
  }
}

/** Live font size + line height for recall merge editors. */
export function buildRecallFontTheme(fontSize: number, lineHeight: RecallLineHeight): Extension {
  const safeLineHeight = isRecallLineHeight(lineHeight) ? lineHeight : 'normal';
  return EditorView.theme({
    '&': { fontSize: `${clampRecallFontSize(fontSize)}px` },
    '.cm-scroller': { lineHeight: RECALL_LINE_HEIGHTS[safeLineHeight] },
  });
}
