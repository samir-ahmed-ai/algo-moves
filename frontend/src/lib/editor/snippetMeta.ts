export type FuncLineTone = 'hl-line-entry' | 'hl-line-func';

/** Classify a line as main entry signature vs nested/helper func signature. */
export function funcLineTone(trimmed: string, lang: string): FuncLineTone | null {
  const l = lang.toLowerCase();
  if (l === 'go') {
    if (/^func\s+\w+\s*\(/.test(trimmed)) return 'hl-line-entry';
    if (/\bfunc\s*\(/.test(trimmed)) return 'hl-line-func';
    return null;
  }
  if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') {
    if (/^function\s+\w+\s*\(/.test(trimmed)) return 'hl-line-entry';
    if (/\bfunction\s*\(/.test(trimmed) || /^const\s+\w+\s*=\s*\(/.test(trimmed)) return 'hl-line-func';
    return null;
  }
  if (l === 'py' || l === 'python') {
    if (/^def\s+\w+\s*\(/.test(trimmed)) return 'hl-line-entry';
    return null;
  }
  if (l === 'java') {
    if (/^(public|private|protected|static|final)[\w\s<>\[\],]*\s+\w+\s*\(/.test(trimmed)) return 'hl-line-entry';
    if (/^[\w<>\[\],]+\s+\w+\s*\(/.test(trimmed) && !/^(return|new|if|for|while|switch)\b/.test(trimmed)) return 'hl-line-func';
    return null;
  }
  return null;
}

/** True when any line is a top-level function signature (for tray border styling). */
export function pieceHasEntrySignature(code: string, lang: string): boolean {
  return code.split('\n').some((line) => funcLineTone(line.trim(), lang) === 'hl-line-entry');
}

export const ENTRY_SIG =
  /^(?:func\s+(\w+)|function\s+(\w+)|def\s+(\w+))([\s\S]*)$/;
