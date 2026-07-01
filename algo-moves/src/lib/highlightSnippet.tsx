import type { ReactNode } from 'react';

type Token = { text: string; className?: string };

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
  return null;
}

/** True when any line is a top-level function signature (for tray border styling). */
export function pieceHasEntrySignature(code: string, lang: string): boolean {
  return code.split('\n').some((line) => funcLineTone(line.trim(), lang) === 'hl-line-entry');
}

const ENTRY_SIG =
  /^(?:func\s+(\w+)|function\s+(\w+)|def\s+(\w+))([\s\S]*)$/;

function renderSignatureLine(
  line: string,
  tone: FuncLineTone,
  keywords: Set<string> | null,
): ReactNode {
  const trimmed = line.trimStart();
  const lead = line.slice(0, line.length - trimmed.length);
  const nameClass = tone === 'hl-line-entry' ? 'hl-sig-name' : 'hl-sig-name-func';

  if (tone === 'hl-line-entry') {
    const m = trimmed.match(ENTRY_SIG);
    if (m) {
      const funcName = m[1] ?? m[2] ?? m[3];
      const kw = m[1] ? 'func' : m[2] ? 'function' : 'def';
      const rest = m[4] ?? '';
      return (
        <>
          {lead}
          <span className="hl-sig-kw">{kw}</span>{' '}
          <span className={nameClass}>{funcName}</span>
          {tokenizeLine(rest, keywords).map((t, ti) => (
            <span key={ti} className={t.className}>
              {t.text}
            </span>
          ))}
        </>
      );
    }
  }

  return tokenizeLine(line, keywords).map((t, ti) => {
    let cls = t.className;
    if (t.text === 'func' || t.text === 'function' || t.text === 'def') cls = 'hl-sig-kw';
    return (
      <span key={ti} className={cls}>
        {t.text}
      </span>
    );
  });
}

const GO_KEYWORDS = new Set([
  'break',
  'case',
  'chan',
  'const',
  'continue',
  'default',
  'defer',
  'else',
  'fallthrough',
  'for',
  'func',
  'go',
  'goto',
  'if',
  'import',
  'interface',
  'map',
  'package',
  'range',
  'return',
  'select',
  'struct',
  'switch',
  'type',
  'var',
  'bool',
  'byte',
  'complex64',
  'complex128',
  'error',
  'float32',
  'float64',
  'int',
  'int8',
  'int16',
  'int32',
  'int64',
  'rune',
  'string',
  'uint',
  'uint8',
  'uint16',
  'uint32',
  'uint64',
  'uintptr',
  'true',
  'false',
  'nil',
  'make',
  'new',
  'len',
  'cap',
  'append',
]);

const JS_KEYWORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'async',
  'await',
  'of',
]);

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

function keywordsFor(lang: string): Set<string> | null {
  switch (lang.toLowerCase()) {
    case 'go':
      return GO_KEYWORDS;
    case 'js':
    case 'javascript':
    case 'ts':
    case 'typescript':
      return JS_KEYWORDS;
    case 'py':
    case 'python':
      return PY_KEYWORDS;
    default:
      return null;
  }
}

function tokenizeLine(line: string, keywords: Set<string> | null): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j) });
      i = j;
      continue;
    }
    if (line.startsWith('//', i)) {
      tokens.push({ text: line.slice(i), className: 'hl-comment' });
      break;
    }
    if (line.startsWith('#', i) && (i === 0 || /\s/.test(line[i - 1] ?? ''))) {
      tokens.push({ text: line.slice(i), className: 'hl-comment' });
      break;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === q) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ text: line.slice(i, j), className: 'hl-string' });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[\w]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const cls = keywords?.has(word) ? 'hl-keyword' : undefined;
      tokens.push({ text: word, className: cls });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[\w.xXa-fA-F]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), className: 'hl-number' });
      i = j;
      continue;
    }
    tokens.push({ text: ch, className: 'hl-punct' });
    i++;
  }
  return tokens;
}

/** Static syntax-colored markup for small reassemble snippets. */
export function highlightSnippet(code: string, lang = 'go'): ReactNode {
  const keywords = keywordsFor(lang);
  const lines = code.split('\n');
  return lines.map((line, li) => {
    const tone = funcLineTone(line.trim(), lang);
    if (tone) {
      return (
        <div key={li} className={`piece-code-line ${tone}`}>
          {renderSignatureLine(line, tone, keywords)}
        </div>
      );
    }
    return (
      <div key={li} className="piece-code-line">
        {tokenizeLine(line, keywords).map((t, ti) => (
          <span key={ti} className={t.className}>
            {t.text}
          </span>
        ))}
      </div>
    );
  });
}
