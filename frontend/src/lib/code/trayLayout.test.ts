import { describe, expect, it } from 'vitest';
import type { CodePiece } from './codePieces';
import { balanceTrayColumns, dedentForDisplay, estimatePieceRows } from './trayLayout';

const piece = (id: string, code: string): CodePiece => ({ id, code, role: id });

describe('trayLayout', () => {
  it('dedents shared leading whitespace', () => {
    expect(dedentForDisplay('\t\tif x {\n\t\t\treturn 1\n\t\t}')).toBe('if x {\n\treturn 1\n}');
  });

  it('estimates more rows for long lines', () => {
    expect(estimatePieceRows('short')).toBe(1);
    expect(estimatePieceRows('x'.repeat(64))).toBe(2);
  });

  it('counts row width from raw code including leading indent', () => {
    const code = '\t'.repeat(10) + 'x'.repeat(25);
    expect(estimatePieceRows(code, 32)).toBe(2);
    expect(estimatePieceRows('x'.repeat(25), 32)).toBe(1);
  });

  it('balances tall blocks across columns', () => {
    const tray = [
      piece('a', 'line\nline\nline\nline'),
      piece('b', 'x'),
      piece('c', 'y'),
      piece('d', 'z'),
    ];
    const cols = balanceTrayColumns(tray, 2);
    expect(cols[0]!.length + cols[1]!.length).toBe(4);
    const leftRows = cols[0]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code), 0);
    const rightRows = cols[1]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code), 0);
    expect(Math.abs(leftRows - rightRows)).toBeLessThanOrEqual(3);
  });

  it('uses wrapCols when balancing', () => {
    const long = piece('long', 'x'.repeat(50));
    const short = piece('short', 'y');
    const wide = balanceTrayColumns([long, short], 2, 32);
    const narrow = balanceTrayColumns([long, short], 2, 16);
    const wideSpread = Math.abs(
      wide[0]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code, 32), 0) -
        wide[1]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code, 32), 0),
    );
    const narrowSpread = Math.abs(
      narrow[0]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code, 16), 0) -
        narrow[1]!.reduce((n, { piece: p }) => n + estimatePieceRows(p.code, 16), 0),
    );
    expect(narrowSpread).toBeGreaterThanOrEqual(wideSpread);
  });
});
