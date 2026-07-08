import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { clampScrollTop, clampSelectionAfterReplace } from './scheduleRecallMergeRefresh';

/** Replace draft pane content from props while preserving cursor + scroll when possible. */
export function syncDraftToEditorView(view: EditorView, draft: string): boolean {
  const editorDraft = view.state.doc.toString();
  if (draft === editorDraft) return false;

  const scrollEl = view.scrollDOM;
  const scrollTop = scrollEl.scrollTop;
  const { anchor, head } = view.state.selection.main;
  const clamped = clampSelectionAfterReplace(anchor, head, draft.length);

  view.dispatch({
    changes: { from: 0, to: editorDraft.length, insert: draft },
    selection: EditorSelection.single(clamped.anchor, clamped.head),
  });

  scrollEl.scrollTop = clampScrollTop(scrollTop, scrollEl.scrollHeight, scrollEl.clientHeight);
  return true;
}

/**
 * Keep the caret visually anchored across a MergeView reconfigure. Recomputing diff spacers
 * changes the pixel height of content above the caret, so without compensation the line you
 * are typing drifts up/down in the viewport. Captures the caret's viewport offset before the
 * reconfigure and returns a settle() to call afterwards, which adjusts scrollTop by the
 * measured delta once layout has been recomputed. No-ops when the pane isn't focused or the
 * caret isn't currently rendered (e.g. off-screen), so it never fights normal typing.
 */
export function preserveCaretViewport(view: { a: EditorView; b: EditorView }): () => void {
  const ed = view.b?.hasFocus ? view.b : view.a?.hasFocus ? view.a : null;
  if (!ed) return () => {};
  const head = ed.state.selection.main.head;
  const before = ed.coordsAtPos(head)?.top ?? null;
  if (before == null) return () => {};

  return () => {
    ed.requestMeasure({
      key: 'recall-caret-anchor',
      read: () => ed.coordsAtPos(head)?.top ?? null,
      write: (after) => {
        if (after == null) return;
        const delta = after - before;
        if (Math.abs(delta) >= 1) ed.scrollDOM.scrollTop += delta;
      },
    });
  };
}

/** Request layout remeasure on both merge panes (needed before spacer alignment). */
export function remeasureMergeViews(view: { a: EditorView; b: EditorView }): void {
  view.a?.requestMeasure();
  view.b?.requestMeasure();
}

/** Remeasure after the browser paints so merge spacers get accurate line heights. */
export function remeasureMergeViewsAfterPaint(view: { a: EditorView; b: EditorView }): void {
  requestAnimationFrame(() => {
    remeasureMergeViews(view);
  });
}
