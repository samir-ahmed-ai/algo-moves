import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PanelNodeBodySlot, registerPanelNodeBodyRenderer } from './panelNodeRegistry';

describe('panelNodeRegistry', () => {
  it('throws in DEV when renderer is not registered', () => {
    vi.stubEnv('DEV', true);
    expect(() => PanelNodeBodySlot({} as never)).toThrow('PanelNodeBody renderer not registered');
    vi.unstubAllEnvs();
  });

  it('renders registered renderer', () => {
    function StubBody() {
      return createElement('span', { 'data-testid': 'stub' }, 'ok');
    }
    registerPanelNodeBodyRenderer(StubBody);
    const html = renderToStaticMarkup(createElement(PanelNodeBodySlot, {} as never));
    expect(html).toContain('ok');
  });
});
