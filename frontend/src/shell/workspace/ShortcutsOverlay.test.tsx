import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShortcutsOverlay, WORKSPACE_SHORTCUTS } from './ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  it('renders every registered workspace shortcut', () => {
    const html = renderToStaticMarkup(<ShortcutsOverlay onClose={() => {}} />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Keyboard shortcuts');
    for (const shortcut of WORKSPACE_SHORTCUTS) {
      expect(html).toContain(shortcut.label);
      for (const key of shortcut.keys) expect(html).toContain(key);
    }
  });
});
