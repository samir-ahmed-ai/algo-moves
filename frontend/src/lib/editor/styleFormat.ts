// ─── Language helpers ──────────────────────────────────────────────────────

export type StyleLang = 'go' | 'js' | 'python' | 'java' | 'default';

export function styleLangFromId(lang?: string): StyleLang {
  const id = (lang ?? '').toLowerCase();
  if (id === 'go') return 'go';
  if (id === 'js' || id === 'javascript' || id === 'ts' || id === 'typescript') return 'js';
  if (id === 'py' || id === 'python') return 'python';
  if (id === 'java') return 'java';
  return 'default';
}

/** Indentation unit: tab for Go, 4 spaces for Java/Python, 2 spaces for JS/TS. */
export function indentUnitForLang(lang?: string): string {
  const style = styleLangFromId(lang);
  if (style === 'go') return '\t';
  if (style === 'java' || style === 'python') return '    ';
  return '  ';
}

// ─── Literal / comment protection ──────────────────────────────────────────

/**
 * Matches (in priority order):
 *  raw strings `…`, double-quoted "…", single-quoted '…',
 *  line comments //…, block comments /* … *\/
 */
const LITERAL_RE =
  /`[^`\\]*(?:\\.[^`\\]*)*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

function protectLiterals(line: string): { bare: string; slots: string[] } {
  const slots: string[] = [];
  const bare = line.replace(LITERAL_RE, (m) => {
    const key = `\x00${slots.length}\x00`;
    slots.push(m);
    return key;
  });
  return { bare, slots };
}

function restoreLiterals(bare: string, slots: string[]): string {
  // eslint-disable-next-line no-control-regex -- placeholder tokens use NUL delimiters
  return bare.replace(/\x00(\d+)\x00/g, (_, i) => slots[Number(i)] ?? '');
}

// ─── Spacing rules ──────────────────────────────────────────────────────────

/**
 * Apply spacing rules to one line with literals already replaced by placeholders.
 *
 * Design principles:
 *  - Be CONSERVATIVE: only space operators when we are confident of context.
 *  - Never corrupt composite literals `Type{…}` or slice syntax `[i:j]`.
 *  - Go short-assign `:=` always gets spaces; bare `:` is left alone (too ambiguous).
 *  - `{` gets a space only when it follows `)` or a block-opening keyword.
 *  - `}` is NOT touched here; its placement is managed by `braceFormat`.
 */
function formatBareSpacing(bare: string, style: StyleLang): string {
  let s = bare;

  // 1. Commas: strip surrounding space, add exactly one after
  s = s.replace(/\s*,\s*/g, ', ');

  // 2. Go short-assign
  s = s.replace(/\s*:=\s*/g, ' := ');

  // 3. Compound operators (longest first). Guards prevent `==` matching inside `===`.
  for (const op of [
    '<<=', '>>=', '===', '!==', '==', '!=', '<=', '>=',
    '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
    '<<', '>>', '=>',
  ]) {
    const esc = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const first = esc[0];
    const last = esc[esc.length - 1];
    const lb = first === '=' || first === '!' || first === '<' || first === '>'
      ? `(?<![${first}=!<>])` : '';
    const la = last === '=' || last === '>' || last === '<'
      ? `(?![${last}=])` : '';
    s = s.replace(new RegExp(`${lb}${esc}${la}`, 'g'), ` ${op} `);
  }

  // 4. Assignment `=` (standalone, not part of any compound op)
  s = s.replace(
    // eslint-disable-next-line no-control-regex -- placeholder tokens use NUL delimiters
    /([a-zA-Z0-9_\])])\s*(?<![!<>:+\-*/%&|^=])=(?![=>])\s*([a-zA-Z0-9_(["'`\x00\-])/g,
    '$1 = $2',
  );

  // 5. Arithmetic / bitwise binary operators (exclude `*` — handled separately).
  s = s.replace(
    /([a-zA-Z0-9_\])])\s*([+\-/%&|^])\s*([a-zA-Z0-9_(\[])/g,
    '$1 $2 $3',
  );

  // 5b. Multiplication `*` only in clear arithmetic contexts (not pointer types).
  s = s.replace(/([)\]0-9])\s*\*\s*([(\[0-9a-zA-Z_])/g, '$1 * $2');

  // 5c. `} else {` / `} catch {` chains
  s = s.replace(/\}\s*(else|catch|finally)\s*\{/g, '} $1 {');

  // Semicolon before identifier: `;ok` → `; ok` (if-init, for clauses)
  s = s.replace(/;([a-zA-Z_])/g, '; $1');

  // Return type / slice after `)`: `)[]int` → `) []int`
  s = s.replace(/\)(?=\[)/g, ') ');

  // 6. `<` and `>` as comparison operators between word-like tokens.
  //    Skipped for Java where `<T>` generic syntax is common.
  if (style !== 'java') {
    s = s.replace(/([a-zA-Z0-9_\])]) *< *([a-zA-Z0-9_(])/g, '$1 < $2');
    s = s.replace(/([a-zA-Z0-9_\])]) *> *([a-zA-Z0-9_(])/g, '$1 > $2');
  }

  // 7. Space before `{` for block openers
  s = s.replace(/\)\s*\{/g, ') {');

  const BLOCK_KW_GO = 'if|for|switch|select|else|func|struct|interface';
  const BLOCK_KW_NONGO = 'if|for|while|switch|else|catch|finally|try|function|class';
  const kwPat = style === 'go' ? BLOCK_KW_GO : BLOCK_KW_NONGO;
  s = s.replace(new RegExp(`\\b(${kwPat})\\s*\\{`, 'g'), '$1 {');

  // Func / function body brace: `func foo()[]int{` → `func foo()[]int {`
  if (/\bfunc(tion)?\b/.test(s)) {
    s = s.replace(/(\S)\s*\{\s*$/, '$1 {');
  }

  // For / while loop body brace: `for ... nums{` → `for ... nums {`
  if (/^\s*(for|while)\b/.test(s)) {
    s = s.replace(/(\S)\s*\{\s*$/, '$1 {');
  }

  // If-init body brace: `if x; ok{` → `if x; ok {`
  if (/^\s*if\b/.test(s)) {
    s = s.replace(/(\S)\s*\{\s*$/, '$1 {');
  }

  // 8. Keyword spacing before `(`:  `if(` → `if (`
  if (style === 'go') {
    s = s.replace(/\b(if|for|switch|select)\s*\(/g, '$1 (');
  } else {
    s = s.replace(/\b(if|for|while|switch|catch)\s*\(/g, '$1 (');
  }

  // 9. Remove spaces INSIDE parentheses: `f( x )` → `f(x)`
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  // 10. Collapse any double-spaces introduced by the rules above
  s = s.replace(/ {2,}/g, ' ');

  return s.trimEnd();
}

/** Normalize spacing on one source line (preserves leading indentation). */
export function formatLineSpacing(line: string, style: StyleLang): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  // Leave comment-only lines intact (only trim trailing space)
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return line.trimEnd();
  }
  const indent = line.slice(0, line.length - line.trimStart().length);
  const { bare, slots } = protectLiterals(trimmed);
  return indent + restoreLiterals(formatBareSpacing(bare, style), slots);
}

// ─── Inline-brace expansion ─────────────────────────────────────────────────

/**
 * Decide whether `{ … }` written inline on one line should be split onto
 * multiple lines.
 *
 * Expand (block context):
 *   `func foo() { return 1 }`  →  head ends with `)`
 *   `if (x > 0) { return x }`  →  head ends with `)`
 *   `} else { stmt }`           →  head ends with `}` (catch / else chain)
 *   `for { break }`             →  lastWord is `for` / block keyword
 *
 * Keep inline (composite literal / expression):
 *   `return []int{j, i}`        →  head ends with `t` from `int` – NOT a keyword
 *   `seen := map[int]int{v: i}` →  same
 *   `Point{x: 1, y: 2}`        →  identifier before `{`
 */
function shouldExpandBlock(headBeforeBrace: string): boolean {
  const h = headBeforeBrace.trimEnd();
  if (!h) return false;

  // After ), always a block opener
  if (h.endsWith(')')) return true;

  // After another closing brace (} else {, } catch {)
  if (h.endsWith('}')) return true;

  // Last identifier is a block keyword
  const lastWord = /\b(\w+)\s*$/.exec(h)?.[1];
  const BLOCK_KW_LAST = new Set([
    'else', 'try', 'finally', 'do',
    'struct', 'interface', 'enum', 'class', 'namespace',
  ]);
  if (lastWord && BLOCK_KW_LAST.has(lastWord)) return true;

  // First word on the line is a block-opening keyword
  // (handles `func foo() ReturnType {`, `for {`, `switch x {`)
  const firstWord = /^\s*(\w+)/.exec(h)?.[1];
  const BLOCK_KW_FIRST = new Set([
    'func', 'function', 'if', 'for', 'while', 'switch', 'select',
    'case', 'default', 'try', 'catch', 'finally', 'class', 'struct', 'interface',
  ]);
  if (firstWord && BLOCK_KW_FIRST.has(firstWord)) return true;

  return false;
}

/** Split `} else {` / `} catch {` onto separate lines before brace expansion. */
function splitElseChains(source: string): string {
  return source.replace(/\}\s*(else|catch|finally)\s*\{/g, '} $1 {');
}

/** Expand inline blocks; repeat until stable (handles `} else {` chains on one line). */
function expandInlineBracesStable(source: string, unit: string): string {
  let prev = '';
  let cur = source;
  while (cur !== prev) {
    prev = cur;
    cur = expandInlineBraces(splitElseChains(cur), unit);
  }
  return cur;
}

/**
 * Walk through each line; if a line has `{ body }` inline AND the head looks
 * like a block opener, split it across multiple lines.
 *
 * Protects string literals so braces inside strings are ignored.
 */
function expandInlineBraces(source: string, unit: string): string {
  const out: string[] = [];

  for (const raw of source.replace(/\n+$/, '').split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) { out.push(''); continue; }

    const indent = raw.slice(0, raw.length - raw.trimStart().length);
    const { bare, slots } = protectLiterals(trimmed);

    // Find the first `{` not inside a string/comment
    const braceIdx = bare.indexOf('{');
    if (braceIdx === -1) {
      out.push(indent + restoreLiterals(bare, slots));
      continue;
    }

    const headBare = bare.slice(0, braceIdx);
    const headRestored = restoreLiterals(headBare, slots);

    // Tail is everything after the opening `{`
    const tailBare = bare.slice(braceIdx + 1).trim();
    const tailRestored = restoreLiterals(tailBare, slots);

    // Empty body or just closing brace – keep as-is
    if (!tailBare || tailBare === '}') {
      out.push(indent + restoreLiterals(bare, slots));
      continue;
    }

    // Don't expand composite literals
    if (!shouldExpandBlock(headRestored)) {
      out.push(indent + restoreLiterals(bare, slots));
      continue;
    }

    // Split: head {, body lines, }
    out.push(`${indent}${headRestored.trimEnd()} {`);

    const inner = unit;
    if (tailRestored.endsWith('}')) {
      // Inline block with closing: split body on `;`
      const body = tailRestored.slice(0, -1).trim();
      const stmts = body
        .split(';')
        .map((st) => st.trim())
        .filter(Boolean);
      const hadTrailingSemi = body.trimEnd().endsWith(';');
      for (let i = 0; i < stmts.length; i++) {
        const semi = i < stmts.length - 1 || hadTrailingSemi ? ';' : '';
        out.push(`${indent}${inner}${stmts[i]}${semi}`);
      }
      out.push(`${indent}}`);
    } else {
      // Partial (no closing brace yet) – just put rest on next line
      out.push(`${indent}${inner}${tailRestored}`);
    }
  }

  return out.join('\n');
}

// ─── Brace-aware indentation ────────────────────────────────────────────────

/**
 * Re-indent `source` purely from `{}` depth — robust for partial / incomplete
 * code where the language service cannot build a full syntax tree.
 *
 * Only `{` and `}` affect depth; `(`, `)`, `[`, `]` are intentionally ignored
 * so that multi-line function signatures and slice types don't skew depth.
 *
 * String/comment literals are protected before counting to avoid braces
 * inside strings from corrupting the depth counter.
 */
export function braceFormat(source: string, unit: string): string {
  const makeIndent = (d: number) => (unit === '\t' ? '\t'.repeat(d) : unit.repeat(d));
  let depth = 0;
  const out: string[] = [];

  for (const raw of source.replace(/\n+$/, '').split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) { out.push(''); continue; }

    // Count only `{}` (not `()[]`) after masking literals
    const { bare } = protectLiterals(trimmed);
    let opens = 0;
    let closes = 0;
    for (const ch of bare) {
      if (ch === '{') opens++;
      else if (ch === '}') closes++;
    }

    // A line starting with `}` decrements BEFORE we write it
    const startsClose = bare.trimStart().startsWith('}');
    if (startsClose && depth > 0) depth--;

    out.push(makeIndent(depth) + trimmed);

    // Net change after writing: opens minus closes, but the leading `}`
    // was already subtracted above so add it back into the accounting
    depth = Math.max(0, depth + opens - closes + (startsClose ? 1 : 0));
  }

  return out.join('\n');
}

// ─── Trailing cleanup ───────────────────────────────────────────────────────

function trimTrailingLines(text: string): string {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  let end = lines.length;
  while (end > 0 && lines[end - 1] === '') end--;
  return lines.slice(0, end).join('\n');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Apply spacing normalization to every line WITHOUT changing indentation.
 * Used as a final pass after a language-service indent to clean up any
 * spacing issues introduced by the indenter.
 */
export function applySpacingOnly(source: string, lang?: string): string {
  const style = styleLangFromId(lang);
  return trimTrailingLines(
    source
      .replace(/\n+$/, '')
      .split('\n')
      .map((line) => formatLineSpacing(line, style))
      .join('\n'),
  );
}

/**
 * Full formatting pass: spacing → inline-brace expansion → re-indent from `{}` depth → trim.
 *
 * For Python, only spacing is applied (Python indentation is significant and
 * cannot be inferred from braces).
 */
export function formatCompleteSource(source: string, lang?: string): string {
  const style = styleLangFromId(lang);
  const unit = indentUnitForLang(lang);

  // Python: only normalize spacing, never touch indentation
  if (style === 'python') {
    return trimTrailingLines(
      source
        .replace(/\n+$/, '')
        .split('\n')
        .map((line) => formatLineSpacing(line, style))
        .join('\n'),
    );
  }

  // 1. Normalize spacing on every line
  const spaced = source
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => formatLineSpacing(line, style))
    .join('\n');

  // 2. Expand inline `{ stmt }` blocks (stable pass handles `} else {` chains)
  const expanded = expandInlineBracesStable(spaced, unit);

  // 3. Re-indent from brace depth
  const indented = braceFormat(expanded, unit);

  return trimTrailingLines(indented);
}
