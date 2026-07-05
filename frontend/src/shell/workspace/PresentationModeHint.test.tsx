import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PresentationModeHint } from './PresentationModeHint';

describe('PresentationModeHint', () => {
  it('renders the presentation escape hint as status text', () => {
    const html = renderToStaticMarkup(<PresentationModeHint />);

    expect(html).toContain('role="status"');
    expect(html).toContain('Presentation mode');
    expect(html).toContain('Esc');
    expect(html).toContain('F');
  });
});
