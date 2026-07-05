import { describe, expect, it } from 'vitest';
import { PANEL_NODE_CHROME, panelNodeChrome } from './panelNodeChrome';

describe('panelNodeChrome', () => {
  it('returns empty defaults for unknown kinds', () => {
    expect(panelNodeChrome('unknown-kind')).toEqual({});
  });

  it('workbench hides both handles and sets min height', () => {
    const chrome = panelNodeChrome('workbench');
    expect(chrome.hideTargetHandle).toBe(true);
    expect(chrome.hideSourceHandle).toBe(true);
    expect(chrome.panelMinClass).toBe('min-h-[480px]');
    expect(chrome.bodyFlex).toBe(true);
    expect(chrome.codeLike).toBeUndefined();
  });

  it('problem hides target handle only', () => {
    const chrome = panelNodeChrome('problem');
    expect(chrome.hideTargetHandle).toBe(true);
    expect(chrome.hideSourceHandle).toBeUndefined();
  });

  it('codeLike kinds include code studio panels', () => {
    for (const kind of ['code', 'scratch', 'reassemble', 'recall'] as const) {
      expect(PANEL_NODE_CHROME[kind]?.codeLike).toBe(true);
    }
  });
});
