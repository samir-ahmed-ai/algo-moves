import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
  autoSelectAndIndent,
  formatSelectedText,
  formatEditorText,
  indentExtensionsForLang,
} from './codeFormat';
import { languageExtension } from './languageExtension';

describe('formatSelectedText', () => {
  it('re-indents only the selected lines using full-doc context', () => {
    const state = EditorState.create({
      doc: 'func main() {\nreturn 1\n}\n\nfunc other() {\nreturn 2\n}',
      extensions: [...indentExtensionsForLang('go'), languageExtension('go')!],
    });
    const line2 = state.doc.line(2);
    const { text, from } = formatSelectedText(state, line2.from, line2.to, 'go');
    expect(from).toBe(line2.from);
    expect(text).toContain('\treturn 1');
    expect(text).not.toContain('return 2');
  });
});

describe('autoSelectAndIndent', () => {
  it('is exported and callable as a command', () => {
    expect(typeof autoSelectAndIndent).toBe('function');
  });
});

describe('formatEditorText', () => {
  it('re-indents with language-aware rules', () => {
    const state = EditorState.create({
      doc: 'func main() {\nreturn 1\n}',
      extensions: [...indentExtensionsForLang('go'), languageExtension('go')!],
    });
    const formatted = formatEditorText(state, 'go');
    expect(formatted).toContain('\treturn 1');
  });
});
