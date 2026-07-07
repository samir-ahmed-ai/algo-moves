import { describe, expect, it } from 'vitest';
import { normalizeLayoutPreset } from '@/lib/canvas/layoutPrefs';

describe('normalizeLayoutPreset', () => {
  it('migrates legacy Study preset name', () => {
    expect(normalizeLayoutPreset('Study')).toBe('TraceFocus');
    expect(normalizeLayoutPreset('study')).toBe('TraceFocus');
    expect(normalizeLayoutPreset('exam')).toBe('Minimal');
    expect(normalizeLayoutPreset('demo')).toBe('Demo');
    expect(normalizeLayoutPreset('Minimal')).toBe('Minimal');
    expect(normalizeLayoutPreset(undefined)).toBe('TraceFocus');
  });
});
