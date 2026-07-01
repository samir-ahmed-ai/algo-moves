export interface CodePiece {
  id: string;
  code: string;
  role: string;
}

const MAX_PIECE_LINES = 8;
const MIN_PIECES = 4;
/** Minimum blocks after brace/preamble strip — can be lower than MIN_PIECES. */
export const MIN_REASSEMBLE_PIECES = 2;

function roleFromLine(line: string): string {
  const t = line.trim();
  if (/^func\s/.test(t)) return 'function signature';
  if (/^for\s/.test(t)) return 'loop';
  if (/^if\s/.test(t)) return 'conditional';
  if (/^else if\s/.test(t)) return 'else-if branch';
  if (/^else\s*\{/.test(t) || t === 'else {') return 'else branch';
  if (/^return\s/.test(t)) return 'return statement';
  if (t === '}' || t.startsWith('}')) return 'close block';
  if (/^package\s/.test(t)) return 'package declaration';
  if (/^import\s/.test(t)) return 'import';
  if (t.startsWith('//')) return 'comment';
  return t.slice(0, 48) || 'code block';
}

function stableId(index: number, firstLine: string): string {
  const slug = firstLine.trim().replace(/\W+/g, '-').slice(0, 24) || 'block';
  return `p${index}-${slug}`;
}

function isHeaderLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('package ') ||
    trimmed.startsWith('import ') ||
    trimmed === '' ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*')
  );
}

function isSplitBoundary(trimmed: string): boolean {
  if (/^func\s/.test(trimmed)) return true;
  if (/^for\s/.test(trimmed)) return true;
  if (/^if\s/.test(trimmed)) return true;
  if (/^else/.test(trimmed)) return true;
  if (/^return\s/.test(trimmed)) return true;
  return false;
}

/** True when every non-empty line is exactly `{` or `}`. */
export function isBraceOnlyPiece(code: string): boolean {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((l) => l === '{' || l === '}');
}

/** Fold standalone `{` / `}` pieces into neighboring blocks without changing join order. */
export function mergeBraceOnlyPieces(pieces: CodePiece[]): CodePiece[] {
  if (pieces.length === 0) return pieces;

  const out: CodePiece[] = [];
  let pending = '';

  for (const p of pieces) {
    if (isBraceOnlyPiece(p.code)) {
      pending = pending ? `${pending}\n${p.code}` : p.code;
      continue;
    }

    if (pending) {
      out.push({ ...p, code: `${pending}\n${p.code}` });
      pending = '';
    } else {
      out.push({ ...p });
    }
  }

  if (pending && out.length > 0) {
    out[out.length - 1] = {
      ...out[out.length - 1],
      code: `${out[out.length - 1].code}\n${pending}`,
    };
  } else if (pending) {
    out.push({ ...pieces[0], code: pending });
  }

  return out;
}

/** True when every non-empty line is preamble (package, import, comments). */
export function isPreambleOnlyPiece(code: string): boolean {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(isHeaderLine);
}

/** Drop leading package/import/comment-only blocks from the puzzle tray. */
export function stripPreamblePieces(pieces: CodePiece[]): CodePiece[] {
  let i = 0;
  while (i < pieces.length && isPreambleOnlyPiece(pieces[i].code)) i++;
  let rest = pieces.slice(i);
  if (rest.length === 0) return rest;
  const lines = rest[0].code.split('\n');
  let drop = 0;
  while (drop < lines.length && isHeaderLine(lines[drop].trim())) drop++;
  if (drop === 0) return rest;
  const code = lines.slice(drop).join('\n');
  if (!code.trim()) return rest.slice(1);
  rest = [{ ...rest[0], code }, ...rest.slice(1)];
  return rest;
}

function finalizeReassemblePieces(source: string, pieces: CodePiece[]): CodePiece[] | null {
  const stripped = stripPreamblePieces(pieces);
  if (stripped.length < MIN_REASSEMBLE_PIECES) return null;
  if (stripped.some((p) => p.code.split('\n').length > MAX_PIECE_LINES + 2)) return null;
  if (norm(assembleDraft(source, stripped)) !== norm(source)) return null;
  return stripped;
}

/** Split source into ordered blocks for the reassemble puzzle. Returns null if unsuitable. */
export function splitCodeIntoPieces(source: string): CodePiece[] | null {
  const lines = source.split('\n');
  if (lines.length < 6) return null;

  const rawBlocks: string[][] = [];
  let current: string[] = [];
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inHeader && isHeaderLine(trimmed)) {
      current.push(line);
      continue;
    }

    if (inHeader && current.length > 0) {
      current = [];
      inHeader = false;
    }

    const shouldSplit =
      current.length > 0 &&
      (isSplitBoundary(trimmed) || (current.length >= MAX_PIECE_LINES && trimmed !== ''));

    if (shouldSplit) {
      rawBlocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) rawBlocks.push(current);

  let pieces = rawBlocks
    .map((block, i) => {
      const code = block.join('\n').replace(/\n+$/, '');
      if (!code.trim()) return null;
      const firstLine = block.find((l) => l.trim()) ?? block[0] ?? '';
      return {
        id: stableId(i, firstLine),
        code,
        role: roleFromLine(firstLine),
      };
    })
    .filter(Boolean) as CodePiece[];

  pieces = coarsenPieces(pieces);
  if (pieces.length < MIN_REASSEMBLE_PIECES) return null;

  pieces = mergeBraceOnlyPieces(pieces);
  const finalized = finalizeReassemblePieces(source, pieces);
  if (finalized) return finalized;

  // Fallback: split every N lines at blank boundaries
  const fallback = splitByLineGroups(lines);
  if (fallback && fallback.length >= MIN_PIECES) {
    return finalizeReassemblePieces(source, mergeBraceOnlyPieces(fallback));
  }
  return null;
}

function norm(s: string): string {
  return s
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

function coarsenPieces(pieces: CodePiece[]): CodePiece[] {
  if (
    pieces.length >= MIN_REASSEMBLE_PIECES &&
    pieces.every((p) => p.code.split('\n').length <= MAX_PIECE_LINES)
  ) {
    return pieces;
  }

  const merged: CodePiece[] = [];
  let buf: CodePiece[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    merged.push({
      id: buf[0].id,
      code: buf.map((p) => p.code).join('\n'),
      role: buf[0].role,
    });
    buf = [];
  };

  for (const p of pieces) {
    const lines = p.code.split('\n').length;
    const bufLines = buf.reduce((n, b) => n + b.code.split('\n').length, 0);
    if (buf.length > 0 && (bufLines + lines > MAX_PIECE_LINES || merged.length + buf.length >= pieces.length - 1)) {
      flush();
    }
    buf.push(p);
    if (buf.reduce((n, b) => n + b.code.split('\n').length, 0) >= 3) flush();
  }
  flush();

  return merged.length >= MIN_REASSEMBLE_PIECES ? merged : pieces;
}

function splitByLineGroups(lines: string[]): CodePiece[] | null {
  const targetSize = Math.max(3, Math.ceil(lines.length / 10));
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    const isBlank = line.trim() === '';
    if (current.length >= targetSize && (isBlank || current.length >= targetSize + 2)) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) blocks.push(current);

  if (blocks.length < MIN_PIECES) return null;

  return blocks.map((block, i) => {
    const code = block.join('\n').replace(/\n+$/, '');
    const firstLine = block.find((l) => l.trim()) ?? '';
    return { id: stableId(i, firstLine), code, role: roleFromLine(firstLine) };
  });
}

export function joinPieces(pieces: CodePiece[]): string {
  return pieces.map((p) => p.code).join('\n');
}

/** Preamble in reference before the first piece (package, imports, comments). */
export function preambleForPieces(reference: string, pieces: CodePiece[]): string {
  if (pieces.length === 0) return '';
  const anchor = pieces[0].code.split('\n')[0]?.trim();
  if (!anchor) return '';
  const idx = reference.indexOf(anchor);
  if (idx <= 0) return '';
  return reference.slice(0, idx).replace(/\n+$/, '');
}

/** Full draft text: preamble + pieces with original spacing from reference. */
export function assembleDraft(reference: string, pieces: CodePiece[]): string {
  if (pieces.length === 0) return '';
  let pos = 0;
  let result = '';
  for (const piece of pieces) {
    const idx = reference.indexOf(piece.code, pos);
    if (idx < 0) {
      const body = joinPieces(pieces);
      const anchor = pieces[0].code.split('\n')[0]?.trim() ?? '';
      const start = anchor ? reference.indexOf(anchor) : -1;
      return start > 0 ? reference.slice(0, start) + body : body;
    }
    result += reference.slice(pos, idx) + piece.code;
    pos = idx + piece.code.length;
  }
  return result + reference.slice(pos);
}

/** Curated override wins; otherwise auto-split. Null = skip reassemble phase. */
export function resolveCodePieces(source: string, curated?: CodePiece[]): CodePiece[] | null {
  if (curated && curated.length >= MIN_PIECES) {
    const stripped = stripPreamblePieces(mergeBraceOnlyPieces(curated));
    return stripped.length >= MIN_REASSEMBLE_PIECES ? stripped : null;
  }
  if (!source.trim()) return null;
  return splitCodeIntoPieces(source);
}
