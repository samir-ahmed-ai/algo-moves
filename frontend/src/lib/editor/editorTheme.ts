import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/** VS Code Dark+ / Light+ token palettes (mirrors the default VS Code themes). */
const VSCODE_DARK = {
  bg: '#1e1e1e',
  gutterBg: '#1e1e1e',
  gutterFg: '#858585',
  fg: '#d4d4d4',
  caret: '#aeafad',
  selection: '#264f78',
  activeLine: '#2a2d2e',
  activeLineGutter: '#c6c6c6',
  keyword: '#569cd6',
  control: '#c586c0',
  string: '#ce9178',
  comment: '#6a9955',
  variable: '#9cdcfe',
  type: '#4ec9b0',
  function: '#dcdcaa',
  number: '#b5cea8',
  operator: '#d4d4d4',
  meta: '#569cd6',
  invalid: '#f44747',
} as const;

const VSCODE_LIGHT = {
  bg: '#ffffff',
  gutterBg: '#ffffff',
  gutterFg: '#237893',
  fg: '#000000',
  caret: '#000000',
  selection: '#add6ff',
  activeLine: '#f3f3f3',
  activeLineGutter: '#0b216f',
  keyword: '#0000ff',
  control: '#af00db',
  string: '#a31515',
  comment: '#008000',
  variable: '#001080',
  type: '#267f99',
  function: '#795e26',
  number: '#098658',
  operator: '#000000',
  meta: '#0000ff',
  invalid: '#cd3131',
} as const;

const EDITOR_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function buildSyntaxHighlight(isDark: boolean): HighlightStyle {
  const p = isDark ? VSCODE_DARK : VSCODE_LIGHT;
  return HighlightStyle.define([
    { tag: [t.controlKeyword, t.self], color: p.control },
    { tag: [t.keyword, t.modifier, t.special(t.brace)], color: p.keyword },
    { tag: [t.string, t.special(t.string), t.regexp, t.character], color: p.string },
    {
      tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
      color: p.comment,
      fontStyle: 'italic',
    },
    { tag: [t.variableName, t.propertyName, t.labelName], color: p.variable },
    { tag: [t.className, t.typeName, t.namespace, t.standard(t.typeName)], color: p.type },
    {
      tag: [t.function(t.variableName), t.definition(t.variableName), t.definition(t.propertyName)],
      color: p.function,
    },
    { tag: [t.number, t.bool, t.null, t.atom, t.literal], color: p.number },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: p.operator },
    { tag: [t.meta, t.processingInstruction, t.annotation], color: p.meta },
    { tag: t.invalid, color: p.invalid, textDecoration: 'underline' },
  ]);
}

/** Token-aware editor chrome + syntax layers using the VS Code Dark+/Light+ palettes. */
export function buildEditorTheme(isDark: boolean): Extension[] {
  const p = isDark ? VSCODE_DARK : VSCODE_LIGHT;
  const chrome = EditorView.theme(
    {
      '&': {
        backgroundColor: p.bg,
        color: p.fg,
        borderRadius: 'var(--radius)',
        outline: 'none',
      },
      '&.cm-focused': {
        boxShadow: `0 0 0 1px ${p.selection}, 0 18px 42px rgba(0, 0, 0, ${isDark ? '0.24' : '0.1'})`,
      },
      '.cm-scroller': {
        fontFamily: EDITOR_FONT_STACK,
        lineHeight: 'var(--editor-line-height, 1.55)',
      },
      '.cm-line': {
        paddingLeft: '0.65rem',
        paddingRight: '0.65rem',
      },
      '.cm-content': {
        caretColor: p.caret,
        paddingTop: '0.65rem',
        paddingBottom: '0.65rem',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: p.caret,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: `${p.selection} !important`,
      },
      '.cm-gutters': {
        backgroundColor: p.gutterBg,
        color: p.gutterFg,
        borderRight: '1px solid color-mix(in srgb, var(--border, #2b3340) 86%, transparent)',
        paddingRight: '0.15rem',
      },
      '.cm-activeLineGutter': {
        backgroundColor: p.activeLine,
        color: p.activeLineGutter,
      },
      '.cm-activeLine': {
        backgroundColor: p.activeLine,
      },
      '.cm-selectionMatch': {
        backgroundColor: `${p.selection}55`,
        outline: `1px solid ${p.selection}`,
      },
      '.cm-matchingBracket': {
        backgroundColor: `${p.selection}66`,
        color: p.fg,
        outline: `1px solid ${p.selection}`,
      },
      '.cm-nonmatchingBracket': {
        backgroundColor: `${p.invalid}22`,
        color: p.invalid,
        outline: `1px solid ${p.invalid}`,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: p.activeLine,
        border: `1px solid ${p.selection}`,
        borderRadius: '999px',
        color: p.gutterFg,
        padding: '0 0.45rem',
      },
    },
    { dark: isDark },
  );

  return [chrome, syntaxHighlighting(buildSyntaxHighlight(isDark))];
}

/** Syntax token colors only — for read-only inline snippets (no editor chrome). Defaults to dark palette. */
export function syntaxHighlightExtension(isDark = true): Extension {
  return syntaxHighlighting(buildSyntaxHighlight(isDark));
}
