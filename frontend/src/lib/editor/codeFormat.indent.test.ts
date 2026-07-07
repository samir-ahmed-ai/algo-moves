import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { braceFormat, formatEditorText, indentExtensionsForLang } from './codeFormat';
import { languageExtension } from './languageExtension';

describe('braceFormat', () => {
  it('indents with tabs for partial Go bodies', () => {
    const messy = 'func main() {\nreturn 1\n}\n';
    expect(braceFormat(messy, '\t')).toBe('func main() {\n\treturn 1\n}');
  });
});

describe('formatEditorText on messy code', () => {
  it('indents a misaligned Go function body', () => {
    const messy = 'func main() {\nreturn 1\n}\n';
    const langExt = languageExtension('go');
    const state = EditorState.create({
      doc: messy,
      extensions: [...indentExtensionsForLang('go'), ...(langExt ? [langExt] : [])],
    });
    const formatted = formatEditorText(state, 'go');
    expect(formatted).not.toBe(messy);
    expect(formatted).toContain('\treturn 1');
  });

  it('converts space-indented partial drafts to tabs for Go', () => {
    const messy = 'func main() {\n    return 1\n}\n';
    const langExt = languageExtension('go');
    const state = EditorState.create({
      doc: messy,
      extensions: [...indentExtensionsForLang('go'), ...(langExt ? [langExt] : [])],
    });
    expect(formatEditorText(state, 'go')).toBe('func main() {\n\treturn 1\n}');
  });

  it('indents misaligned JavaScript', () => {
    const messy = 'function f() {\nreturn 1;\n}\n';
    const langExt = languageExtension('javascript');
    const state = EditorState.create({
      doc: messy,
      extensions: [...indentExtensionsForLang('js'), ...(langExt ? [langExt] : [])],
    });
    const formatted = formatEditorText(state, 'javascript');
    expect(formatted).toMatch(/^\s+return 1;/m);
  });
});
