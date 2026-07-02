import { describe, expect, it } from 'vitest';
import { getMeldPrompts } from './index';

describe('mind-meld prompts', () => {
  it('keeps the same prompt count across locales', () => {
    expect(getMeldPrompts('ar').length).toBe(getMeldPrompts('en').length);
  });

  it('returns Arabic prompts by default locale set', () => {
    const ar = getMeldPrompts('ar');
    expect(ar[0]?.q).toBe('ملاذك المثالي؟');
  });

  it('returns English prompts when requested', () => {
    const en = getMeldPrompts('en');
    expect(en[0]?.q).toBe('Ideal escape?');
  });
});
