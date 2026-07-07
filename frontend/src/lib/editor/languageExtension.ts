import { type LanguageSupport } from '@codemirror/language';
import { java } from '@codemirror/lang-java';
import { go } from '@codemirror/lang-go';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';

export function normalizeEditorLanguage(lang?: string): string {
  const normalized = (lang ?? '').trim().toLowerCase();
  if (normalized === 'node' || normalized === 'jsx') return 'javascript';
  if (normalized === 'tsx') return 'typescript';
  if (normalized === 'python3') return 'python';
  return normalized;
}

/** Map a plugin's language id to a CodeMirror language extension (extend as plugins need). */
export function languageExtension(lang?: string): LanguageSupport | null {
  switch (normalizeEditorLanguage(lang)) {
    case 'go':
      return go();
    case 'js':
    case 'javascript':
      return javascript();
    case 'ts':
    case 'typescript':
      return javascript({ typescript: true });
    case 'py':
    case 'python':
      return python();
    case 'java':
      return java();
    default:
      return null;
  }
}
