import type { MergeView } from '@codemirror/merge';
import type { RecallMergeViewOptions } from '@/lib/code/recallMergeDiff';
import { refreshRecallMergeView } from '@/lib/editor/refreshRecallMergeView';
import {
  preserveCaretViewport,
  remeasureMergeViews,
  remeasureMergeViewsAfterPaint,
} from '@/lib/editor/syncDraftToEditorView';

const DEBOUNCE_MS = 50;

export type RecallMergeRefreshScheduler = {
  /** Schedule a debounced merge refresh (coalesces rapid edits). */
  schedule: () => void;
  /** Run merge refresh immediately, cancelling any pending debounced call. */
  flush: () => void;
  /** Cancel pending refresh and release timers. */
  dispose: () => void;
};

/** Coalesce MergeView.reconfigure calls during rapid typing / bulk edits. */
export function createRecallMergeRefreshScheduler(
  getView: () => MergeView | null,
  getOptions: () => RecallMergeViewOptions | undefined,
  onAfterRefresh?: (view: MergeView) => void,
): RecallMergeRefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const runRefresh = () => {
    timer = null;
    if (disposed) return;
    const view = getView();
    if (!view) return;
    const isMerge = 'a' in view && 'b' in view;
    // Anchor the caret before the diff/spacer layout shifts, then restore after it settles.
    const settleCaret = isMerge ? preserveCaretViewport(view) : () => {};
    if (isMerge) remeasureMergeViews(view);
    refreshRecallMergeView(view, getOptions());
    onAfterRefresh?.(view);
    if (isMerge) remeasureMergeViewsAfterPaint(view);
    settleCaret();
  };

  return {
    schedule() {
      if (disposed) return;
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(runRefresh, DEBOUNCE_MS);
    },
    flush() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      runRefresh();
    },
    dispose() {
      disposed = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

/** Clamp editor selection to valid range after a document replace. */
export function clampSelectionAfterReplace(
  anchor: number,
  head: number,
  docLen: number,
): { anchor: number; head: number } {
  const clamp = (pos: number) => Math.max(0, Math.min(pos, docLen));
  return { anchor: clamp(anchor), head: clamp(head) };
}

/** Clamp scroll position after the document shrinks. */
export function clampScrollTop(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  return Math.max(0, Math.min(scrollTop, maxScroll));
}
