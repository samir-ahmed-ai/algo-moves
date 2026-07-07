import { describe, expect, it } from 'vitest';
import { clampRecallFontSize, RECALL_FONT_DEFAULT } from '@/lib/editor/recallEditorTheme';
import { loadEditorPrefs } from './editorPrefs';

describe('editorPrefs', () => {
  it('loads recall editor defaults', () => {
    const prefs = loadEditorPrefs();
    expect(prefs.fontSize).toBe(RECALL_FONT_DEFAULT);
    expect(prefs.lineHeight).toBe('normal');
    expect(prefs.showLineNumbers).toBe(true);
    expect(prefs.showPointer).toBe(true);
    expect(prefs.highlightChanges).toBe(true);
    expect(prefs.mergeGutter).toBe(true);
    expect(prefs.mergeCollapse).toBe(true);
    expect(prefs.recallCompact).toBe(true);
    expect(prefs.recallReveal).toBe('full');
    expect(prefs.pointerMode).toBe('line');
  });

  it('clamps recall font size', () => {
    expect(clampRecallFontSize(6)).toBe(10);
    expect(clampRecallFontSize(24)).toBe(18);
    expect(clampRecallFontSize(12.7)).toBe(13);
  });
});
