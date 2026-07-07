import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildMobileModeUrl, parseMobileHash, writeMobileHash } from './mobileRoute';

describe('mobileRoute', () => {
  it('parses empty mobile hash on pathname route', () => {
    expect(parseMobileHash('', '/mobile')).toEqual({});
  });

  it('parses topic routes on mobile pathname', () => {
    expect(parseMobileHash('#topic/prep-arrays-all', '/mobile')).toEqual({
      topicId: 'prep-arrays-all',
    });
  });

  it('parses topic/item routes', () => {
    expect(parseMobileHash('#topic/prep-arrays-all/item/prep-arrays-two-sum', '/mobile')).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
    });
  });

  it('returns null for non-mobile routes', () => {
    expect(parseMobileHash('#home', '/home')).toBeNull();
  });

  it('buildMobileModeUrl includes mobile pathname', () => {
    vi.stubGlobal('location', { origin: 'http://localhost', search: '' });
    expect(buildMobileModeUrl()).toMatch(/\/mobile$/);
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal('history', { replaceState: vi.fn(), pushState: vi.fn() });
    vi.stubGlobal('location', { pathname: '/mobile', search: '', hash: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writeMobileHash encodes category and item', () => {
    const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    writeMobileHash({ categoryId: 'prep-arrays-all', itemId: 'two-sum' });
    expect(replace).toHaveBeenCalledWith(
      null,
      '',
      expect.stringMatching(/\/mobile#track\/.+\/category\/prep-arrays-all\/item\/two-sum$/),
    );
  });
});

describe('parseMobileHash decode', () => {
  it('decodes encoded topic ids', () => {
    expect(parseMobileHash('#topic/prep%2Darrays%2Dall', '/mobile')).toEqual({
      topicId: 'prep-arrays-all',
    });
  });
});
