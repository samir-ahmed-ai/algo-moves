import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
  indentWithTab,
} from '@codemirror/commands';
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
import { vim, Vim } from '@replit/codemirror-vim';
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

/** Block pointer/focus on the reference pane — wheel scroll on the scroller still works. */
export const blockReferencePaneInteraction: Extension = EditorView.domEventHandlers({
  mousedown: () => true,
  click: () => true,
  dblclick: () => true,
  focus: (_e, view) => {
    view.dom.blur();
    return true;
  },
});

/** Display-only extensions for the merge reference pane (no typing, selection, or keymaps). */
export function mergeReferenceCoreExtensions(
  langExt: Extension | null,
  opts?: { lineNumbers?: boolean; lang?: string },
): Extension[] {
  const showLineNumbers = opts?.lineNumbers !== false;
  const lang = opts?.lang?.trim() || undefined;
  return [
    blockReferencePaneInteraction,
    EditorView.contentAttributes.of({ tabindex: '-1', 'aria-readonly': 'true' }),
    ...indentExtensionsForLang(lang),
    ...lineNumberExtensions(showLineNumbers),
    highlightSpecialChars(),
    foldGutter({ openText: '▾', closedText: '▸' }),
    ...sectionFoldExtensions(lang),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    ...(langExt ? [langExt] : []),
  ];
}

/** Core Code Studio extensions — mirrors basicSetup minus autocompletion. */
export function coreEditorExtensions(
  langExt: Extension | null,
  opts?: { lineNumbers?: boolean; lang?: string },
): Extension[] {
  const showLineNumbers = opts?.lineNumbers !== false;
  const lang = opts?.lang?.trim() || undefined;
  return [
    ...indentExtensionsForLang(lang),
    ...lineNumberExtensions(showLineNumbers),
    highlightSpecialChars(),
    history(),
    foldGutter({ openText: '▾', closedText: '▸' }),
    ...sectionFoldExtensions(lang),
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
      ...sectionFoldBindings(lang),
      { key: 'Mod-[', run: indentLess },
      { key: 'Mod-]', run: indentMore },
      indentWithTab,
    ]),
    codeFormatKeymap,
    ...(langExt ? [langExt] : []),
  ];
}

let vimCommandsDefined = false;

/** The recall draft auto-saves on every keystroke, so :w / :wq / :x are friendly no-ops
 *  (vim users' muscle memory doesn't hit "command not implemented"). Defined once, lazily. */
function defineVimCommands(): void {
  if (vimCommandsDefined) return;
  vimCommandsDefined = true;
  Vim.defineEx('write', 'w', () => {});
  Vim.defineEx('wq', 'wq', () => {});
  Vim.defineEx('xit', 'x', () => {});
}

/** Vim must load before other keymaps. */
export function vimExtensions(enabled: boolean): Extension[] {
  if (!enabled) return [];
  defineVimCommands();
  return [vim({ status: true })];
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
    ...coreEditorExtensions(opts.langExt, opts.lang ? { lang: opts.lang } : undefined),
    ...wrapExtensions(opts.wrap),
  ];
}
