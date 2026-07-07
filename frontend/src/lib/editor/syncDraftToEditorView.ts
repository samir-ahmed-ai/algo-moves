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
