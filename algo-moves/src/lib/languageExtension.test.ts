import { describe, expect, it } from 'vitest';
import { languageExtension } from './languageExtension';

describe('languageExtension', () => {
  it('maps known language ids', () => {
    expect(languageExtension('go')).not.toBeNull();
    expect(languageExtension('javascript')).not.toBeNull();
    expect(languageExtension('python')).not.toBeNull();
  });

  it('normalizes case and aliases', () => {
    expect(languageExtension('GO')).not.toBeNull();
    expect(languageExtension('js')).not.toBeNull();
    expect(languageExtension('py')).not.toBeNull();
  });

  it('returns null for unknown languages', () => {
    expect(languageExtension('rust')).toBeNull();
    expect(languageExtension('')).toBeNull();
  });
});
