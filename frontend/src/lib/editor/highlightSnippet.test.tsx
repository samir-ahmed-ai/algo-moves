import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  funcLineTone,
  highlightSnippet,
  highlightSnippetShiki,
  pieceHasEntrySignature,
} from './highlightSnippet';

describe('funcLineTone', () => {
  it('marks top-level Go func as entry', () => {
    expect(funcLineTone('func solveNQueens(n int) ([]int, bool) {', 'go')).toBe('hl-line-entry');
  });

  it('marks nested Go func as helper signature', () => {
    expect(funcLineTone('safe := func(row, col int) bool {', 'go')).toBe('hl-line-func');
  });

  it('marks var func type declaration as helper', () => {
    expect(funcLineTone('var place func(row int) bool', 'go')).toBe('hl-line-func');
  });
});

describe('pieceHasEntrySignature', () => {
  it('detects entry signature in a piece', () => {
    expect(pieceHasEntrySignature('func solveNQueens(n int) {', 'go')).toBe(true);
    expect(pieceHasEntrySignature('\tsafe := func(row int) bool {', 'go')).toBe(false);
  });
});

describe('highlightSnippet (plain fallback)', () => {
  it('styles main func signature with named highlight', () => {
    const html = renderToStaticMarkup(<>{highlightSnippet('func solveNQueens(n int) {', 'go')}</>);
    expect(html).toContain('hl-line-entry');
    expect(html).toContain('hl-sig-name');
    expect(html).toContain('hl-sig-kw');
    expect(html).toContain('solveNQueens');
  });

  it('styles nested func signature differently', () => {
    const html = renderToStaticMarkup(
      <>{highlightSnippet('safe := func(row, col int) bool {', 'go')}</>,
    );
    expect(html).toContain('hl-line-func');
    expect(html).not.toContain('hl-sig-name');
    expect(html).not.toContain('hl-line-entry');
  });

  it('handles place-sig two-line piece', () => {
    const code = 'var place func(row int) bool\nplace = func(row int) bool {';
    const html = renderToStaticMarkup(<>{highlightSnippet(code, 'go')}</>);
    expect(html).toContain('hl-line-func');
    expect(pieceHasEntrySignature(code, 'go')).toBe(false);
  });

  it('preserves plain text for unknown languages', () => {
    const html = renderToStaticMarkup(<>{highlightSnippet('let x = 1', 'rust')}</>);
    expect(html.replace(/<[^>]+>/g, '')).toContain('let x = 1');
    expect(html).not.toContain('hl-keyword');
  });
});

describe('highlightSnippetShiki', () => {
  it('highlights Go keywords and comments', async () => {
    const html = renderToStaticMarkup(
      <>{await highlightSnippetShiki('return true // note', 'go')}</>,
    );
    expect(html).toContain('hl-keyword');
    expect(html).toContain('return');
    expect(html).toContain('hl-comment');
    expect(html).toContain('note');
    expect(html).toContain('piece-code-line');
  });

  it('styles main func signature with named highlight', async () => {
    const html = renderToStaticMarkup(
      <>{await highlightSnippetShiki('func solveNQueens(n int) {', 'go')}</>,
    );
    expect(html).toContain('hl-line-entry');
    expect(html).toContain('hl-sig-name');
    expect(html).toContain('hl-sig-kw');
    expect(html).toContain('solveNQueens');
  });
});
