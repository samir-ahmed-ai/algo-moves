import { Braces, Code, CornerDownLeft, GitBranch, Repeat, type LucideIcon } from 'lucide-react';
import type { CodePiece } from './codePieces';

export type BlockKind = 'def' | 'loop' | 'branch' | 'return' | 'close' | 'stmt';

export interface BlockMeta {
  label: string;
  shape: string;
  icon: LucideIcon;
  glyph: string;
  bg: string;
  stroke: string;
  text: string;
}

export const BLOCK_META: Record<BlockKind, BlockMeta> = {
  def: {
    label: 'signature',
    shape: 'blk--start',
    icon: Braces,
    glyph: 'ƒ',
    bg: 'var(--accent-bg)',
    stroke: 'var(--accent)',
    text: 'var(--accent)',
  },
  loop: {
    label: 'loop',
    shape: 'blk--tab',
    icon: Repeat,
    glyph: '↻',
    bg: 'var(--team2-bg)',
    stroke: 'var(--team2-stroke)',
    text: 'var(--team2-text)',
  },
  branch: {
    label: 'branch',
    shape: 'blk--branch',
    icon: GitBranch,
    glyph: '?',
    bg: 'var(--team1-bg)',
    stroke: 'var(--team1-stroke)',
    text: 'var(--team1-text)',
  },
  return: {
    label: 'return',
    shape: 'blk--return',
    icon: CornerDownLeft,
    glyph: '↩',
    bg: 'var(--good-bg)',
    stroke: 'var(--good)',
    text: 'var(--good)',
  },
  close: {
    label: 'block end',
    shape: 'blk--tab',
    icon: Braces,
    glyph: '}',
    bg: 'var(--surface-2)',
    stroke: 'var(--border-strong)',
    text: 'var(--text-3)',
  },
  stmt: {
    label: 'statement',
    shape: 'blk--tab',
    icon: Code,
    glyph: '·',
    bg: 'var(--team0-bg)',
    stroke: 'var(--team0-stroke)',
    text: 'var(--text-2)',
  },
};

/** Categorise a piece by its role AND its first real line of code (roles are often
 *  curated free-text, so the code is the more reliable signal). */
export function blockKind(piece: CodePiece): BlockKind {
  const role = piece.role.toLowerCase();
  const f = (piece.code.split('\n').find((l) => l.trim()) ?? '').trim().toLowerCase();
  if (/\b(signature|function|method)\b/.test(role) || /^(func|function|def|pub\s+fn|fn)\b/.test(f))
    return 'def';
  if (/\bloop\b/.test(role) || /^(for|while)\b/.test(f)) return 'loop';
  if (/\breturn\b/.test(role) || /^(return|yield)\b/.test(f)) return 'return';
  if (/\b(condition|branch|else-if)\b/.test(role) || /^(if|else|elif|switch|case|match)\b/.test(f))
    return 'branch';
  if (
    /\bclose\b/.test(role) ||
    /^[})]/.test(f) ||
    /^(import|package)\b/.test(f) ||
    f.startsWith('//')
  )
    return 'close';
  return 'stmt';
}

export function pieceRoleMeta(piece: CodePiece): BlockMeta & { kind: BlockKind } {
  const kind = blockKind(piece);
  return { kind, ...BLOCK_META[kind] };
}

/** Large punctuation glyph for blueprint aside — prefers the piece's leading character when iconic. */
export function pieceGlyph(piece: CodePiece, kind: BlockKind): string {
  const line = (piece.code.split('\n').find((l) => l.trim()) ?? '').trim();
  const ch = line[0];
  if (ch && '{}[])"\''.includes(ch)) return ch;
  if (/^(return|yield)\b/.test(line)) return '↩';
  if (/^(func|function|def|pub\s+fn|fn)\b/.test(line)) return 'ƒ';
  if (/^(for|while)\b/.test(line)) return '↻';
  if (/^(if|else|elif|switch|case|match)\b/.test(line)) return '?';
  return BLOCK_META[kind].glyph;
}
