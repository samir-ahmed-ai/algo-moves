import { describe, expect, it } from 'vitest';
import {
  BASE_THEME_IDS,
  DEFAULT_THEME_PRESET,
  HYBRID_THEME_IDS,
  THEME_META,
  THEME_PRESETS,
  normalizeThemePreset,
} from './registry';

describe('normalizeThemePreset', () => {
  it('accepts all 20 preset ids', () => {
    expect(THEME_PRESETS).toHaveLength(20);
    for (const id of THEME_PRESETS) {
      expect(normalizeThemePreset(id)).toBe(id);
    }
  });

  it('exposes metadata for every preset with a swatch', () => {
    expect(THEME_META).toHaveLength(20);
    for (const meta of THEME_META) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.swatch.length).toBeGreaterThan(0);
    }
  });

  it('has 12 base and 8 hybrid presets', () => {
    expect(BASE_THEME_IDS).toHaveLength(12);
    expect(HYBRID_THEME_IDS).toHaveLength(8);
  });

  it('maps legacy share-url presets', () => {
    expect(normalizeThemePreset('classic')).toBe('mint-saas');
    expect(normalizeThemePreset('ocean')).toBe('cosmic-lilac');
    expect(normalizeThemePreset('forest')).toBe('mint-saas');
    expect(normalizeThemePreset('grape')).toBe('violet-tech');
  });

  it('falls back to default for unknown values', () => {
    expect(normalizeThemePreset(undefined)).toBe(DEFAULT_THEME_PRESET);
    expect(normalizeThemePreset('not-a-theme')).toBe(DEFAULT_THEME_PRESET);
  });
});
