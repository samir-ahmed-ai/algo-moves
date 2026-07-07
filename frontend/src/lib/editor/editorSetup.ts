import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { strictRecallDraft } from '@/lib/code';
import { Transaction, EditorState, type Extension } from '@codemirror/state';
import { vim } from '@replit/codemirror-vim';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  EditorView,
} from '@codemirror/view';

export function lineNumberExtensions(enabled: boolean): Extension[] {
  return enabled ? [lineNumbers(), highlightActiveLineGutter()] : [];
}

/**
 * Read-only reference pane for recall — syntax + folds only.
 * Skips selection/active-line/drop/history extensions that fight recall reveal
 * decorations and can corrupt CM6's tile tree when the pane is clicked.
 */
export function referenceEditorExtensions(langExt: Extension | null, opts?: { lineNumbers?: boolean }): Extension[] {
  const showLineNumbers = opts?.lineNumbers !== false;
  return [
    ...lineNumberExtensions(showLineNumbers),
    highlightSpecialChars(),
    foldGutter(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    keymap.of(foldKeymap),
    ...(langExt ? [langExt] : []),
  ];
}

/** Keep focus on the draft side when the read-only reference pane is clicked.
 * Allows fold/gutter widgets (cm-foldWidget, cm-collapsedLines) through unchanged. */
export function focusDraftOnReferenceClick(getDraftView: () => EditorView | null | undefined): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, _view) {
      const target = event.target as Element;
      // Let fold toggles, collapsed-line expanders, and gutter markers handle themselves.
      if (target.closest('.cm-foldWidget, .cm-collapsedLines, .cm-gutterElement, .cm-gutters')) {
        return false;
      }
      getDraftView()?.focus();
      return true;
    },
  });
}

/**
 * Validates each draft edit against the reference inside CM (single transaction on mistake).
 * `onRejected` is deferred via queueMicrotask so it never fires synchronously inside a CM dispatch.
 * Programmatic resets (e.g. prop-driven dispatches) are always valid, so the filter is a no-op for them.
 */
export function recallDraftTransactionFilter(
  getReference: () => string,
  onRejected?: () => void,
): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;
    const attempted = tr.newDoc.toString();
    const validated = strictRecallDraft(getReference(), attempted);
    if (validated === attempted) return tr;
    if (onRejected) queueMicrotask(onRejected);
    return tr.startState.update({
      changes: { from: 0, to: tr.startState.doc.length, insert: validated },
      selection: { anchor: validated.length },
      annotations: Transaction.userEvent.of('input.recall.reset'),
    });
  });
}

/** Core Code Studio extensions — mirrors basicSetup minus autocompletion. */
export function coreEditorExtensions(langExt: Extension | null, opts?: { lineNumbers?: boolean }): Extension[] {
  const showLineNumbers = opts?.lineNumbers !== false;
  return [
    ...lineNumberExtensions(showLineNumbers),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
    ...(langExt ? [langExt] : []),
  ];
}

/** Vim must load before other keymaps. */
export function vimExtensions(enabled: boolean): Extension[] {
  return enabled ? [vim({ status: true })] : [];
}

export function wrapExtensions(enabled: boolean): Extension[] {
  return enabled ? [EditorView.lineWrapping] : [];
}

export function studioEditorExtensions(opts: { vim: boolean; wrap: boolean; langExt: Extension | null }): Extension[] {
  return [...vimExtensions(opts.vim), ...coreEditorExtensions(opts.langExt), ...wrapExtensions(opts.wrap)];
}
