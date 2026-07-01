import { describe, expect, it } from 'vitest';
import { blockKind, pieceRoleMeta } from './codePieceRoles';
import { codePieces } from '../plugins/n-queens/practice';

describe('blockKind', () => {
  it('maps signature from role text and func line', () => {
    const sig = codePieces.find((p) => p.id === 'sig')!;
    expect(blockKind(sig)).toBe('def');
  });

  it('maps loop from for line even without loop in role', () => {
    const safeLoop = codePieces.find((p) => p.id === 'safe-loop')!;
    expect(blockKind(safeLoop)).toBe('loop');
  });

  it('maps branch from if line', () => {
    const base = codePieces.find((p) => p.id === 'base')!;
    expect(blockKind(base)).toBe('branch');
  });

  it('maps return from return line', () => {
    const fail = codePieces.find((p) => p.id === 'fail')!;
    expect(blockKind(fail)).toBe('return');
  });

  it('pieceRoleMeta includes kind and label', () => {
    const colLoop = codePieces.find((p) => p.id === 'col-loop')!;
    const meta = pieceRoleMeta(colLoop);
    expect(meta.kind).toBe('loop');
    expect(meta.label).toBe('loop');
    expect(meta.stroke).toBeTruthy();
  });
});
