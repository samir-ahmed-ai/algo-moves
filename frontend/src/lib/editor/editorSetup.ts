import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentLess, indentMore, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldCode,
  foldGutter,
  unfoldCode,
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
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { codeFormatKeymap, indentExtensionsForLang } from './codeFormat';
import { sectionFoldBindings, sectionFoldExtensions } from './codeFold';

export function lineNumberExtensions(enabled: boolean): Extension[] {
  return enabled ? [lineNumbers(), highlightActiveLineGutter()] : [];
}

/** Core Code Studio extensions — mirrors basicSetup minus autocompletion. */
export function coreEditorExtensions(
  langExt: Extension | null,
  opts?: { lineNumbers?: boolean; lang?: string },
): Extension[] {
  const showLineNumbers = opts?.lineNumbers !== false;
  return [
    ...indentExtensionsForLang(opts?.lang),
    ...lineNumberExtensions(showLineNumbers),
    highlightSpecialChars(),
    history(),
    foldGutter({ openText: '▾', closedText: '▸' }),
    ...sectionFoldExtensions(opts?.lang),
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
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      // Single-line fold at cursor; section collapse uses Mod-Alt-[ below (not foldKeymap — avoids Mac conflict).
      { key: 'Ctrl-Shift-[', run: foldCode },
      { key: 'Ctrl-Shift-]', run: unfoldCode },
      ...sectionFoldBindings(opts?.lang),
      { key: 'Mod-[', run: indentLess },
      { key: 'Mod-]', run: indentMore },
      indentWithTab,
    ]),
    codeFormatKeymap,
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

export function studioEditorExtensions(opts: {
  vim: boolean;
  wrap: boolean;
  langExt: Extension | null;
  lang?: string;
}): Extension[] {
  return [
    ...vimExtensions(opts.vim),
    ...coreEditorExtensions(opts.langExt, { lang: opts.lang }),
    ...wrapExtensions(opts.wrap),
  ];
}
