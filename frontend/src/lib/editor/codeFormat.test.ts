import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { alignLineTexts, formatEditorText, indentExtensionsForLang, splitForAlign } from './codeFormat';
import { languageExtension } from './languageExtension';

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

describe('splitForAlign', () => {
  it('splits := assignments', () => {
    expect(splitForAlign('x := 1', '=')).toEqual(['x ', ':=', ' 1']);
  });

  it('splits spaced = assignments', () => {
    expect(splitForAlign('count = len(a)', '=')).toEqual(['count', ' = ', 'len(a)']);
  });

  it('rejects == comparisons', () => {
    expect(splitForAlign('a == b', '=')).toBeNull();
  });
});

describe('alignLineTexts', () => {
  it('pads prefixes so delimiters line up', () => {
    expect(
      alignLineTexts(['a := 1', 'bb := 2', 'ccc := 3']),
    ).toEqual(['a   := 1', 'bb  := 2', 'ccc := 3']);
  });

  it('aligns spaced equals', () => {
    expect(
      alignLineTexts(['x = 1', 'yy = 2']),
    ).toEqual(['x  = 1', 'yy = 2']);
  });

  it('returns null when a line has no delimiter', () => {
    expect(alignLineTexts(['a = 1', 'no assign here'])).toBeNull();
  });
});
