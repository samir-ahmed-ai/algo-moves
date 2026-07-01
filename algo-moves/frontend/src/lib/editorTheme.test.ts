import { describe, expect, it } from 'vitest';
import { buildEditorTheme } from './editorTheme';

describe('buildEditorTheme', () => {
  it('returns chrome + syntax extensions for light and dark', () => {
    const light = buildEditorTheme(false);
    const dark = buildEditorTheme(true);
    expect(light.length).toBe(2);
    expect(dark.length).toBe(2);
    expect(light[0]).toBeTruthy();
    expect(light[1]).toBeTruthy();
  });
});
