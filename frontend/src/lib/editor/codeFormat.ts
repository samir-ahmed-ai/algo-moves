import { deleteTrailingWhitespace, selectLine, selectParentSyntax } from '@codemirror/commands';
import { ensureSyntaxTree, indentRange, indentUnit } from '@codemirror/language';
import type { MergeView } from '@codemirror/merge';
import { Compartment, EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, type Command } from '@codemirror/view';
import { languageExtension } from './languageExtension';
import { applySpacingOnly, formatCompleteSource } from './styleFormat';

/** Tab for Go; two spaces for other studio languages. */
export function indentExtensionsForLang(lang?: string): Extension[] {
  const id = (lang ?? '').trim().toLowerCase();
  if (id === 'go') {
    return [indentUnit.of('\t'), EditorState.tabSize.of(4)];
  }
  return [indentUnit.of('  '), EditorState.tabSize.of(2)];
}

const READ_ONLY_REF = [EditorState.readOnly.of(true), EditorView.editable.of(false)];

export const mergeReferenceReadOnly = READ_ONLY_REF;

function leadingIndents(text: string): string[] {
  return text.split('\n').map((line) => /^\s*/.exec(line)?.[0] ?? '');
}

function leadingIndentChanged(before: string, after: string): boolean {
  const a = leadingIndents(before);
  const b = leadingIndents(after);
  if (a.length !== b.length) return true;
  return a.some((indent, i) => indent !== b[i]);
}

export { applySpacingOnly, braceFormat, formatCompleteSource } from './styleFormat';

function inferLangFromState(state: EditorState): string | undefined {
  return state.facet(indentUnit)[0] === '\t' ? 'go' : 'javascript';
}

/**
 * Complete format pipeline:
 *   1. `formatCompleteSource` – spacing + inline-brace expansion + brace-depth indent
 *   2. CM language service `indentRange` – replaces brace-depth indent when the
 *      parser can build a full syntax tree (handles edge cases better)
 *   3. `applySpacingOnly` – spacing-only cleanup on the final result without
 *      re-running the full re-indent (which would undo step 2)
 */
export function formatEditorText(state: EditorState, lang?: string): string {
  const resolvedLang = (lang ?? inferLangFromState(state)).trim();
  const original = state.doc.toString();

  // Step 1 – brace-aware full format (always works, even on partial code)
  let text = formatCompleteSource(original, resolvedLang);

  // Step 2 – try the CM language service for more accurate indentation
  const langExt = languageExtension(resolvedLang);
  if (langExt) {
    try {
      const tempState = EditorState.create({
        doc: text,
        extensions: [...indentExtensionsForLang(resolvedLang), langExt],
      });
      ensureSyntaxTree(tempState, tempState.doc.length, 5000);
      const changes = indentRange(tempState, 0, tempState.doc.length);
      const cmIndented = changes.apply(tempState.doc).toString();

      // Accept CM result only when it actually changed leading whitespace
      if (leadingIndentChanged(text, cmIndented)) {
        text = cmIndented;
      }
    } catch {
      // Keep the deterministic fallback formatter.
    }
  }

  // Step 3 – re-apply spacing rules without touching indentation
  return applySpacingOnly(text, resolvedLang);
}

function applyFormattedText(view: EditorView, formatted: string): boolean {
  const current = view.state.doc.toString();
  if (formatted === current) return false;
  view.dispatch({
    changes: { from: 0, to: current.length, insert: formatted },
    userEvent: 'format.indent',
  });
  return true;
}

/** Format a line-bounded slice of the document (used for selection indent). */
export function formatSelectedText(
  state: EditorState,
  from: number,
  to: number,
  lang?: string,
): { text: string; from: number; to: number } {
  const resolvedLang = (lang ?? inferLangFromState(state)).trim();
  const safeFrom = Math.max(0, Math.min(from, state.doc.length));
  const safeTo = Math.max(safeFrom, Math.min(to, state.doc.length));
  const fromLine = state.doc.lineAt(safeFrom);
  const toLine = state.doc.lineAt(safeTo);
  const sliceFrom = fromLine.from;
  const sliceTo = toLine.to;
  const fromLineNo = fromLine.number;
  const toLineNo = toLine.number;

  const langExt = languageExtension(resolvedLang);
  if (langExt) {
    try {
      const tempState = EditorState.create({
        doc: state.doc.toString(),
        extensions: [...indentExtensionsForLang(resolvedLang), langExt],
      });
      ensureSyntaxTree(tempState, tempState.doc.length, 5000);
      const changes = indentRange(tempState, sliceFrom, sliceTo);
      const newDoc = changes.apply(tempState.doc);
      const newFrom = newDoc.line(fromLineNo).from;
      const newTo = newDoc.line(toLineNo).to;
      const slice = newDoc.sliceString(newFrom, newTo);
      return {
        text: applySpacingOnly(slice, resolvedLang),
        from: sliceFrom,
        to: sliceTo,
      };
    } catch {
      // Fall through to deterministic slice formatting.
    }
  }

  const chunk = state.sliceDoc(sliceFrom, sliceTo);
  return {
    text: formatCompleteSource(chunk, resolvedLang),
    from: sliceFrom,
    to: sliceTo,
  };
}

/**
 * Auto-select the enclosing block (or current line) and re-indent it.
 * With an existing multi-line selection, indents only the selected lines.
 */
export const autoSelectAndIndent: Command = (view) => {
  if (view.state.readOnly) return false;

  if (view.state.selection.main.empty) {
    if (!selectParentSyntax(view)) {
      selectLine(view);
    }
  }

  const { state } = view;
  const range = state.selection.main;
  const { text, from, to } = formatSelectedText(state, range.from, range.to);
  const current = state.sliceDoc(from, to);
  if (text === current) return true;

  view.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.range(from, from + text.length),
    userEvent: 'format.indent',
  });
  return true;
};

/** Format reference + draft panes with matching indent/spacing. */
export function formatMergeViews(
  mergeView: MergeView,
  opts: {
    lang?: string;
    readOnlyCompA: Compartment;
    onDraftChange?: (value: string) => void;
  },
): void {
  const draftFormatted = formatEditorText(mergeView.b.state, opts.lang);
  const refFormatted = formatEditorText(mergeView.a.state, opts.lang);

  applyFormattedText(mergeView.b, draftFormatted);
  opts.onDraftChange?.(mergeView.b.state.doc.toString());

  mergeView.a.dispatch({ effects: opts.readOnlyCompA.reconfigure([]) });
  applyFormattedText(mergeView.a, refFormatted);
  mergeView.a.dispatch({ effects: opts.readOnlyCompA.reconfigure(mergeReferenceReadOnly) });
}

/** Re-indent one editable document and trim trailing whitespace. */
export const formatDocument: Command = (view) => {
  const { state } = view;
  if (state.readOnly) return false;
  const formatted = formatEditorText(state);
  if (!applyFormattedText(view, formatted)) return true;
  deleteTrailingWhitespace(view);
  return true;
};

/** Keymap that formats both merge panes (draft pane only — higher precedence than `formatDocument`). */
export function mergeFormatKeymap(formatBoth: () => void): Extension {
  return keymap.of([{ key: 'Mod-Shift-f', run: () => (formatBoth(), true) }]);
}

export type AlignDelimiter = '=' | ':';

/** Split a line into [prefix, delimiter, suffix] for column alignment. */
export function splitForAlign(
  line: string,
  delimiter: AlignDelimiter,
): [string, string, string] | null {
  if (delimiter === ':') {
    const m = line.match(/^(.*?)(:)(.*)$/);
    return m ? [m[1], m[2], m[3]] : null;
  }
  const colonAssign = line.match(/^(.*?)(:=)(.*)$/);
  if (colonAssign) return [colonAssign[1], colonAssign[2], colonAssign[3]];
  const spaced = line.match(/^(.*?)( = )(.*)$/);
  if (spaced) return [spaced[1], spaced[2], spaced[3]];
  const tight = line.match(/^(.*?)(?<![=!<>:])=(?!=)(.*)$/);
  if (tight) return [tight[1], tight[2], tight[3]];
  return null;
}

/** Pad prefixes so delimiters line up across `lines`. */
export function alignLineTexts(lines: string[], delimiter: AlignDelimiter = '='): string[] | null {
  const parts: [string, string, string][] = [];
  for (const line of lines) {
    const split = splitForAlign(line, delimiter);
    if (!split) return null;
    parts.push(split);
  }
  const maxPrefix = Math.max(...parts.map((p) => p[0].length));
  return parts.map(([prefix, delim, suffix]) => {
    const pad = ' '.repeat(maxPrefix - prefix.length);
    return prefix + pad + delim + suffix;
  });
}

/** Column-align the selected lines on `=` (or `:`). */
export const alignSelection: Command = (view) => {
  const { state } = view;
  if (state.readOnly) return false;

  const range = state.selection.main;
  const fromLine = state.doc.lineAt(range.from);
  const toLine = state.doc.lineAt(range.to);
  if (fromLine.number === toLine.number) return false;

  const lines: string[] = [];
  for (let n = fromLine.number; n <= toLine.number; n++) {
    lines.push(state.doc.line(n).text);
  }

  const aligned = alignLineTexts(lines);
  if (!aligned) return false;

  const changes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = state.doc.line(fromLine.number + i);
    if (line.text !== aligned[i]) {
      changes.push({ from: line.from, to: line.to, insert: aligned[i] });
    }
  }
  if (changes.length === 0) return true;
  view.dispatch({ changes, userEvent: 'format.align' });
  return true;
};

export const codeFormatKeymap = keymap.of([
  { key: 'Mod-Shift-f', run: formatDocument },
  { key: 'Mod-Shift-i', run: autoSelectAndIndent },
  { key: 'Mod-Alt-a', run: alignSelection },
]);
