import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PuzzlePieceShell } from './PuzzlePieceShell';

describe('PuzzlePieceShell', () => {
  it('renders syntax-colored puzzle shell', () => {
    const html = renderToStaticMarkup(
      <PuzzlePieceShell piece={{ id: 'p1', code: 'return x', role: 'logic' }} lang="go" />,
    );
    expect(html).toContain('puzzle-piece--tray');
    expect(html).toContain('hl-keyword');
    expect(html).toContain('return');
  });
});
