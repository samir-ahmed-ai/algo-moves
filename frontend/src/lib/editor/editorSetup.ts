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
import { EditorState, type Extension } from '@codemirror/state';
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
