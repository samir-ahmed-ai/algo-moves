import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CodePieceOverview } from './CodePieceOverview';
import { codePieces } from '../plugins/n-queens/practice';

describe('CodePieceOverview', () => {
  it('renders every section with role caption and index', () => {
    const html = renderToStaticMarkup(<CodePieceOverview pieces={codePieces.slice(0, 3)} lang="go" />);
    expect(html).toContain('code-overview-section');
    expect(html).toContain('signature — return the column per row');
    expect(html).toContain('code-overview-kind');
    expect(html.split('code-overview-section').length - 1).toBe(3);
  });

  it('shows raw piece code including leading indent', () => {
    const init = codePieces.find((p) => p.id === 'init')!;
    const html = renderToStaticMarkup(<CodePieceOverview pieces={[init]} lang="go" />);
    expect(html.replace(/<[^>]+>/g, '')).toContain('\tqueens');
  });
});
