import type { CodePiece } from '../../core/types';
import {
  mergeBraceOnlyPieces,
  stripPreamblePieces,
  MIN_REASSEMBLE_PIECES,
  assembleDraft,
} from '@/lib/code';

const MIN_PIECES = 4;

function roleFromLine(line: string): string {
  const t = line.trim();
  if (/^func\s/.test(t)) return 'function signature';
  if (/^for\s/.test(t)) return 'loop';
  if (/^if\s/.test(t)) return 'conditional';
  if (/^else/.test(t)) return 'else branch';
  if (/^return\s/.test(t)) return 'return statement';
  if (t === '}' || t.startsWith('}')) return 'close block';
  if (/^package\s/.test(t)) return 'package declaration';
  if (/^import\s/.test(t)) return 'import';
  return t.slice(0, 48) || 'code block';
}

function stableId(index: number, firstLine: string): string {
  const slug = firstLine.trim().replace(/\W+/g, '-').slice(0, 24) || 'block';
  return `p${index}-${slug}`;
}

function isBoundary(trimmed: string): boolean {
  if (/^func\s/.test(trimmed)) return true;
  if (/^for\s/.test(trimmed)) return true;
  if (/^if\s/.test(trimmed)) return true;
  if (/^else/.test(trimmed)) return true;
  if (/^return\s/.test(trimmed)) return true;
  return false;
}

function toPieces(rawBlocks: string[][]): CodePiece[] {
  return rawBlocks
    .map((block, i) => {
      const code = block.join('\n').replace(/\n+$/, '');
      if (!code.trim()) return null;
      const firstLine = block.find((l) => l.trim()) ?? block[0] ?? '';
      return { id: stableId(i, firstLine), code, role: roleFromLine(firstLine) };
    })
    .filter(Boolean) as CodePiece[];
}

function splitByBoundaries(lines: string[]): CodePiece[] | null {
  const rawBlocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (current.length > 0 && isBoundary(trimmed)) {
      rawBlocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) rawBlocks.push(current);

  const pieces = toPieces(rawBlocks);
  return pieces.length >= MIN_PIECES ? pieces : null;
}

function splitEvenly(lines: string[]): CodePiece[] | null {
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length < MIN_PIECES) return null;

  const chunk = Math.max(1, Math.ceil(lines.length / MIN_PIECES));
  const rawBlocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (current.length >= chunk && rawBlocks.length < MIN_PIECES - 1) {
      rawBlocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) rawBlocks.push(current);

  const pieces = toPieces(rawBlocks);
  return pieces.length >= MIN_PIECES ? pieces : null;
}

/**
 * Aggressive splitter for short prep Go solutions when the generic splitter
 * returns null (typically files with fewer than six lines).
 */
export function prepCodePieces(source: string): CodePiece[] | null {
  const lines = source.split('\n');
  if (lines.filter((l) => l.trim()).length < MIN_PIECES) return null;
  const raw = splitByBoundaries(lines) ?? splitEvenly(lines);
  if (!raw || raw.length < MIN_REASSEMBLE_PIECES) return null;
  const stripped = stripPreamblePieces(mergeBraceOnlyPieces(raw));
  if (stripped.length < MIN_REASSEMBLE_PIECES) return null;
  if (assembleDraft(source, stripped).trimEnd() !== source.trimEnd()) return null;
  return stripped;
}
