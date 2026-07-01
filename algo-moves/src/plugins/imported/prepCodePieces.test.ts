import { describe, it, expect } from 'vitest';
import { isBraceOnlyPiece } from '../../lib/codePieces';
import { prepCodePieces } from '../../plugins/imported/prepCodePieces';

describe('prepCodePieces', () => {
  const jumpGame = `package main
func jumpGame(nums []int) bool {
\treach := 0
\tfor i := 0; i <= reach && i < len(nums); i++ {
\t\tif i+nums[i] > reach {
\t\t\treach = i + nums[i]
\t\t}
\t}
\treturn reach >= len(nums)-1
}`;

  it('splits short Go solutions into at least three pieces', () => {
    const pieces = prepCodePieces(jumpGame);
    expect(pieces).not.toBeNull();
    expect(pieces!.length).toBeGreaterThanOrEqual(3);
  });

  it('does not emit brace-only pieces', () => {
    const pieces = prepCodePieces(jumpGame);
    expect(pieces).not.toBeNull();
    expect(pieces!.every((p) => !isBraceOnlyPiece(p.code))).toBe(true);
  });

  it('does not emit package main as the first block', () => {
    const pieces = prepCodePieces(jumpGame);
    expect(pieces).not.toBeNull();
    expect(pieces![0].code.trim().startsWith('package main')).toBe(false);
    expect(pieces![0].code.trim().startsWith('func jumpGame')).toBe(true);
  });

  it('returns null for trivial one-liners', () => {
    expect(prepCodePieces('package main\nfunc f() {}')).toBeNull();
  });
});
