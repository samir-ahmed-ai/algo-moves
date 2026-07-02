import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HighlightedCode } from './HighlightedCode';
import { highlightSnippet } from '@/lib/editor';

describe('HighlightedCode', () => {
  it('renders visible Go code with wrap', () => {
    const html = renderToStaticMarkup(
      <HighlightedCode code={'func solve() bool {\n\treturn true\n}'} lang="go" wrap />,
    );
    expect(html).toContain('func');
    expect(html).toContain('return');
    expect(html).toContain('true');
    expect(html).toContain('piece-code-wrap');
    expect(html).toContain('role="code"');
  });

  it('preserves leading indent in rendered output', () => {
    const html = renderToStaticMarkup(
      <HighlightedCode code={'\tqueens := make([]int, n)'} lang="go" wrap />,
    );
    expect(html.replace(/<[^>]+>/g, '')).toContain('\tqueens');
  });
});

describe('highlightSnippet multiline', () => {
  it('emits one block row per source line', () => {
    const html = renderToStaticMarkup(<>{highlightSnippet('a\nb', 'go')}</>);
    expect(html.match(/piece-code-line/g)?.length).toBe(2);
    expect(html.replace(/<[^>]+>/g, '')).toContain('a');
    expect(html.replace(/<[^>]+>/g, '')).toContain('b');
  });
});
