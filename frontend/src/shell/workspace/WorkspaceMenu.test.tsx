import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceProvider } from '@/store/workspace';
import { AuthProvider } from '@/shell/auth';
import { explorerSectionOpen, ExplorerSheet } from './ExplorerSheet';
import { WorkspaceMenu } from './WorkspaceMenu';

describe('explorerSectionOpen', () => {
  it('opens only the catalog section when focused on catalog', () => {
    expect(explorerSectionOpen('catalog', false)).toEqual({
      catalogOpen: true,
      problemsOpen: false,
      addOpen: false,
    });
  });

  it('opens only the add panel section when focused on add', () => {
    expect(explorerSectionOpen('add', false)).toEqual({
      catalogOpen: false,
      problemsOpen: false,
      addOpen: true,
    });
  });

  it('opens all sections while searching', () => {
    expect(explorerSectionOpen('problems', true)).toEqual({
      catalogOpen: true,
      problemsOpen: true,
      addOpen: true,
    });
  });

  it('opens catalog by default when focus is null', () => {
    expect(explorerSectionOpen(null, false)).toEqual({
      catalogOpen: true,
      problemsOpen: false,
      addOpen: false,
    });
  });
});

describe('ExplorerSheet', () => {
  it('renders the catalog explorer when open', () => {
    const html = renderToStaticMarkup(
      <WorkspaceProvider>
        <ExplorerSheet open focus="catalog" onClose={() => {}} />
      </WorkspaceProvider>,
    );

    expect(html).toContain('aria-label="Explorer"');
    expect(html).toContain('Search explorer');
    expect(html).toContain('Catalog');
  });
});

describe('WorkspaceMenu', () => {
  it('renders the hamburger trigger and closed menu state', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <WorkspaceProvider>
          <WorkspaceMenu onOpenPalette={() => {}} onOpenHelp={() => {}} />
        </WorkspaceProvider>
      </AuthProvider>,
    );

    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('nodrag');
    expect(html).not.toContain('role="menu"');
  });
});
