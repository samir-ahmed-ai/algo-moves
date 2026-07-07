import type { ReactNode } from 'react';

type Token = { text: string; className?: string };
type Frame = 'object' | 'array';

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
  while (j < src.length && /\s/.test(src[j])) j++;
  return src[j];
}

function readLiteral(src: string, i: number): { text: string; end: number } | null {
  if (src.startsWith('false', i)) return { text: 'false', end: i + 5 };
  if (src.startsWith('true', i)) return { text: 'true', end: i + 4 };
  if (src.startsWith('null', i)) return { text: 'null', end: i + 4 };
  return null;
}

/** Static syntax-colored markup for pretty-printed JSON. */
export function highlightJson(json: string): ReactNode {
  const trimmed = json.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return json;
  }

  const tokens: Token[] = [];
  const stack: Frame[] = [];
  let i = 0;

  while (i < json.length) {
    const ch = json[i];
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      tokens.push({ text: json.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      const { text, end } = readString(json, i);
      const inObject = stack[stack.length - 1] === 'object';
      const isKey = inObject && peekNonWs(json, end) === ':';
      tokens.push({ text, className: isKey ? 'hl-json-key' : 'hl-json-str' });
      i = end;
      continue;
    }

    const lit = readLiteral(json, i);
    if (lit) {
      tokens.push({ text: lit.text, className: 'hl-json-lit' });
      i = lit.end;
      continue;
    }

    if (/[-0-9]/.test(ch)) {
      let j = i + 1;
      while (j < json.length && /[0-9.eE+-]/.test(json[j])) j++;
      tokens.push({ text: json.slice(i, j), className: 'hl-json-num' });
      i = j;
      continue;
    }

    if (ch === '{' || ch === '[' || ch === '}' || ch === ']' || ch === ',' || ch === ':') {
      tokens.push({ text: ch, className: 'hl-json-punct' });
      if (ch === '{') stack.push('object');
      else if (ch === '[') stack.push('array');
      else if (ch === '}' || ch === ']') stack.pop();
      i++;
      continue;
    }

    tokens.push({ text: ch });
    i++;
  }

  return tokens.map((t, idx) => (
    <span key={idx} className={t.className}>
      {t.text}
    </span>
  ));
}
