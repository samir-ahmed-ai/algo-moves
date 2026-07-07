import type { ReactNode } from 'react';

type Token = Readonly<{ text: string; className?: string }>;
type Frame = 'object' | 'array';

function isWhitespace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

function isLiteralBoundary(ch: string | undefined): boolean {
  return ch === undefined || !/[A-Za-z0-9_$-]/.test(ch);
}

function literalAt(src: string, i: number, literal: string): { text: string; end: number } | null {
  if (!src.startsWith(literal, i)) return null;
  const end = i + literal.length;
  return isLiteralBoundary(src[end]) ? { text: literal, end } : null;
}

function readString(src: string, i: number): { text: string; end: number } {
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2;
      continue;
    }
    if (src[j] === '"') {
      j++;
      break;
    }
    j++;
  }
  return { text: src.slice(i, j), end: j };
}

function peekNonWs(src: string, i: number): string | undefined {
  let j = i;
  while (j < src.length && isWhitespace(src[j])) j++;
  return src[j];
}

function readLiteral(src: string, i: number): { text: string; end: number } | null {
  return literalAt(src, i, 'false') ?? literalAt(src, i, 'true') ?? literalAt(src, i, 'null');
}

function closeFrame(stack: Frame[], ch: string): void {
  const expected = ch === '}' ? 'object' : 'array';
  if (stack[stack.length - 1] === expected) stack.pop();
}

function isNumberStart(src: string, i: number): boolean {
  const ch = src[i];
  if (ch === undefined) return false;
  if (ch === '-') return /[0-9]/.test(src[i + 1] ?? '');
  return /[0-9]/.test(ch);
}

function isNumberBody(ch: string | undefined): boolean {
  return ch !== undefined && /[0-9.eE+-]/.test(ch);
}

function readNumber(src: string, i: number): { text: string; end: number } | null {
  if (!isNumberStart(src, i)) return null;
  let j = i + 1;
  while (isNumberBody(src[j])) j++;
  return { text: src.slice(i, j), end: j };
}

/** Static syntax-colored markup for pretty-printed JSON. */
export function highlightJson(json: string): ReactNode {
  const source = String(json);
  const trimmed = source.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return source;
  }

  const tokens: Token[] = [];
  const stack: Frame[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (isWhitespace(ch)) {
      let j = i + 1;
      while (j < source.length && isWhitespace(source[j])) j++;
      tokens.push({ text: source.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      const { text, end } = readString(source, i);
      const inObject = stack[stack.length - 1] === 'object';
      const isKey = inObject && peekNonWs(source, end) === ':';
      tokens.push({ text, className: isKey ? 'hl-json-key' : 'hl-json-str' });
      i = end;
      continue;
    }

    const lit = readLiteral(source, i);
    if (lit) {
      tokens.push({ text: lit.text, className: 'hl-json-lit' });
      i = lit.end;
      continue;
    }

    const num = readNumber(source, i);
    if (num) {
      tokens.push({ text: num.text, className: 'hl-json-num' });
      i = num.end;
      continue;
    }

    if (ch === '{' || ch === '[' || ch === '}' || ch === ']' || ch === ',' || ch === ':') {
      tokens.push({ text: ch, className: 'hl-json-punct' });
      if (ch === '{') stack.push('object');
      else if (ch === '[') stack.push('array');
      else if (ch === '}' || ch === ']') closeFrame(stack, ch);
      i++;
      continue;
    }

    let j = i + 1;
    while (j < source.length) {
      const lit = readLiteral(source, j);
      if (lit) break;
      const num = readNumber(source, j);
      if (num) break;
      const next = source[j];
      if (
        next === '"' ||
        next === '{' ||
        next === '[' ||
        next === '}' ||
        next === ']' ||
        next === ',' ||
        next === ':' ||
        isWhitespace(next)
      ) {
        break;
      }
      j++;
    }
    tokens.push({ text: source.slice(i, j) });
    i = j;
    continue;
  }

  return tokens.map((t, idx) => (
    <span key={idx} className={t.className}>
      {t.text}
    </span>
  ));
}
