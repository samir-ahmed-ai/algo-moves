import { describe, expect, it } from 'vitest';
import { buildEditorTheme } from './editorTheme';

describe('buildEditorTheme', () => {
  it('returns chrome + syntax extensions for light and dark', () => {
    expect(buildEditorTheme(false).length).toBeGreaterThanOrEqual(2);
    expect(buildEditorTheme(true).length).toBeGreaterThanOrEqual(2);
  });

  it('uses the same token-based stack for light and dark', () => {
    const light = buildEditorTheme(false);
    const dark = buildEditorTheme(true);
    expect(light.length).toBe(dark.length);
    expect(light.length).toBe(2);
  });
});
