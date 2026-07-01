import { describe, it, expect } from 'vitest';
import { prepCodePieces } from '../../plugins/imported/prepCodePieces';

describe('prepCodePieces', () => {
  it('splits short Go solutions into at least four pieces', () => {
    const code = `package main
func add(a, b int) int {
\treturn a + b
}`;
    const pieces = prepCodePieces(code);
    expect(pieces).not.toBeNull();
    expect(pieces!.length).toBeGreaterThanOrEqual(4);
  });

  it('returns null for trivial one-liners', () => {
    expect(prepCodePieces('package main\nfunc f() {}')).toBeNull();
  });
});
