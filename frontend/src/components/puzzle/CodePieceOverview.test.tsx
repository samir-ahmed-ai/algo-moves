import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CodePieceOverview } from './CodePieceOverview';
import { dedentForDisplay } from '@/lib/code';
import { codePieces } from '../../plugins/selection-sort/practice';

describe('CodePieceOverview', () => {
  it('renders every section with role caption and index', () => {
    const sample = codePieces.slice(0, 3);
    const html = renderToStaticMarkup(<CodePieceOverview pieces={sample} lang="go" />);
    expect(html).toContain('code-overview-section');
    expect(html).toContain(sample[0]!.role);
    expect(html).toContain('code-overview-aside');
    expect(html).toContain('code-overview-glyph');
    expect(html.split('code-overview-section').length - 1).toBe(3);
  });

  it('shows dedented piece code for display', () => {
    const init = codePieces[0]!;
    const html = renderToStaticMarkup(<CodePieceOverview pieces={[init]} lang="go" />);
    const dedented = dedentForDisplay(init.code);
    expect(html.replace(/<[^>]+>/g, '')).toContain(dedented.split('\n')[0]!);
    expect(dedented.split('\n')[0]).not.toMatch(/^\t/);
  });
});
