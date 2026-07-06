import { StreamLanguage, type LanguageSupport } from '@codemirror/language';
import { java } from '@codemirror/legacy-modes/mode/clike';
import { go } from '@codemirror/legacy-modes/mode/go';
import { javascript } from '@codemirror/legacy-modes/mode/javascript';
import { python } from '@codemirror/legacy-modes/mode/python';

/** Map a plugin's language id to a CodeMirror language extension (extend as plugins need). */
export function languageExtension(lang?: string): StreamLanguage<unknown> | LanguageSupport | null {
  switch ((lang ?? '').toLowerCase()) {
    case 'go':
      return StreamLanguage.define(go);
    case 'js':
    case 'javascript':
    case 'ts':
    case 'typescript':
      return StreamLanguage.define(javascript);
    case 'py':
    case 'python':
      return StreamLanguage.define(python);
    case 'java':
      return StreamLanguage.define(java);
    default:
      return null;
  }
}
