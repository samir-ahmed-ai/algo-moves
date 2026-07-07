import { describe, expect, it } from 'vitest';
import {
  assembleDraft,
  isBraceOnlyPiece,
  isPreambleOnlyPiece,
  joinPieces,
  mergeBraceOnlyPieces,
  resolveCodePieces,
  splitCodeIntoPieces,
  stripPreamblePieces,
  type CodePiece,
} from './codePieces';

const amountPainted = `package main
func amountPainted(paint [][]int) []int {
	maxR := 0
	for _, p := range paint {
		if p[1] > maxR {
			maxR = p[1]
		}
	}
	jump := make([]int, maxR+1)
	res := make([]int, len(paint))
	for day, p := range paint {
		l, r := p[0], p[1]
		cnt := 0
		for i := l; i < r; {
			if jump[i] == 0 {
				jump[i] = i + 1
				cnt++
				i++
			} else {
				next := jump[i]
				jump[i] = r
				i = next
			}
		}
		res[day] = cnt
	}
	return res
}`;

describe('isBraceOnlyPiece', () => {
  it('detects brace-only blocks', () => {
    expect(isBraceOnlyPiece('}')).toBe(true);
    expect(isBraceOnlyPiece('\t}')).toBe(true);
    expect(isBraceOnlyPiece('{\n}')).toBe(true);
    expect(isBraceOnlyPiece('\treturn x\n}')).toBe(false);
    expect(isBraceOnlyPiece('\tfor _, p := range paint {')).toBe(false);
  });
});

describe('mergeBraceOnlyPieces', () => {
  it('merges trailing close brace into previous piece', () => {
    const pieces: CodePiece[] = [
      { id: 'a', code: '\treturn cur', role: 'return' },
      { id: 'b', code: '}', role: 'close block' },
    ];
    const before = joinPieces(pieces);
    const merged = mergeBraceOnlyPieces(pieces);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.code).toBe('\treturn cur\n}');
    expect(joinPieces(merged)).toBe(before);
  });

  it('merges leading close brace into next piece', () => {
    const pieces: CodePiece[] = [
      { id: 'a', code: '\t}', role: 'close block' },
      { id: 'b', code: '\treturn res', role: 'return' },
    ];
    const before = joinPieces(pieces);
    const merged = mergeBraceOnlyPieces(pieces);
    expect(merged).toHaveLength(1);
    expect(joinPieces(merged)).toBe(before);
  });
});

describe('splitCodeIntoPieces', () => {
  it('does not emit brace-only pieces for amountPainted', () => {
    const pieces = splitCodeIntoPieces(amountPainted);
    expect(pieces).not.toBeNull();
    expect(pieces!.every((p) => !isBraceOnlyPiece(p.code))).toBe(true);
  });

  it('does not emit package main as the first block', () => {
    const pieces = splitCodeIntoPieces(amountPainted);
    expect(pieces).not.toBeNull();
    expect(pieces![0]!.code.trim().startsWith('package main')).toBe(false);
    expect(pieces![0]!.code.trim().startsWith('func ')).toBe(true);
  });

  it('reassembles to the full source via assembleDraft', () => {
    const pieces = splitCodeIntoPieces(amountPainted);
    expect(pieces).not.toBeNull();
    expect(assembleDraft(amountPainted, pieces!).trimEnd()).toBe(amountPainted.trimEnd());
  });
});

describe('stripPreamblePieces', () => {
  it('strips leading preamble-only blocks and inline header lines', () => {
    const pieces: CodePiece[] = [
      { id: 'pkg', code: 'package main', role: 'package declaration' },
      {
        id: 'fn',
        code: 'package main\nfunc f() int {\n\treturn 1\n}',
        role: 'function signature',
      },
    ];
    const stripped = stripPreamblePieces(pieces);
    expect(stripped).toHaveLength(1);
    expect(stripped[0]!.code.trim().startsWith('func f()')).toBe(true);
    expect(assembleDraft('package main\nfunc f() int {\n\treturn 1\n}', stripped).trimEnd()).toBe(
      'package main\nfunc f() int {\n\treturn 1\n}'.trimEnd(),
    );
  });
});

describe('resolveCodePieces', () => {
  it('merges curated trailing close brace pieces', () => {
    const curated: CodePiece[] = [
      { id: 'sig', code: 'func f() int {', role: 'signature' },
      { id: 'init', code: '\tx := 0', role: 'init' },
      { id: 'body', code: '\treturn x', role: 'return' },
      { id: 'close', code: '}', role: 'close block' },
    ];

    const before = joinPieces(curated);
    const resolved = resolveCodePieces('', curated);
    expect(resolved).not.toBeNull();
    expect(resolved!.every((p) => !isBraceOnlyPiece(p.code))).toBe(true);
    expect(joinPieces(resolved!)).toBe(before);
    expect(resolved!.length).toBe(3);
  });

  it('strips curated package main preamble block', () => {
    const source = 'package main\nfunc f() int {\n\tx := 0\n\treturn x\n}';
    const curated: CodePiece[] = [
      { id: 'pkg', code: 'package main', role: 'package declaration' },
      { id: 'sig', code: 'func f() int {', role: 'signature' },
      { id: 'init', code: '\tx := 0', role: 'init' },
      { id: 'body', code: '\treturn x', role: 'return' },
      { id: 'close', code: '}', role: 'close block' },
    ];
    const resolved = resolveCodePieces(source, curated);
    expect(resolved).not.toBeNull();
    expect(isPreambleOnlyPiece(resolved![0]!.code)).toBe(false);
    expect(resolved![0]!.code.startsWith('func f()')).toBe(true);
    expect(assembleDraft(source, resolved!).trimEnd()).toBe(source.trimEnd());
    expect(resolved!.length).toBe(3);
  });
});
