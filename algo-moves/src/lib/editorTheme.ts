import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

function buildSyntaxHighlight(): HighlightStyle {
  return HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.self, t.special(t.brace)], color: 'var(--accent)' },
    { tag: [t.string, t.special(t.string), t.regexp, t.character], color: 'var(--good)' },
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--text-3)', fontStyle: 'italic' },
    { tag: [t.variableName, t.propertyName, t.labelName], color: 'var(--text)' },
    { tag: [t.className, t.typeName, t.namespace, t.standard(t.typeName)], color: 'var(--team1-stroke)' },
    { tag: [t.function(t.variableName), t.definition(t.variableName), t.definition(t.propertyName)], color: 'var(--team2-stroke)' },
    { tag: [t.number, t.bool, t.null, t.atom, t.literal], color: 'var(--edge-active)' },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: 'var(--text-2)' },
    { tag: [t.meta, t.processingInstruction, t.annotation], color: 'var(--ring)' },
    { tag: t.invalid, color: 'var(--bad)', textDecoration: 'underline' },
  ]);
}

/** Token-aware editor chrome + syntax layers that track CSS preset vars. */
export function buildEditorTheme(_isDark: boolean): Extension[] {
  const chrome = EditorView.theme({
    '&': {
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
    },
    '.cm-content': {
      caretColor: 'var(--accent)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent) !important',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--surface-2)',
      color: 'var(--text-3)',
      borderRight: '0.5px solid var(--border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)',
    },
  });

  return [chrome, syntaxHighlighting(buildSyntaxHighlight())];
}

/** Syntax token colors only — for read-only inline snippets (no editor chrome). */
export function syntaxHighlightExtension(): Extension {
  return syntaxHighlighting(buildSyntaxHighlight());
}
