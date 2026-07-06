import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildAppUrl,
  getHashBody,
  normalizeLegacyUrl,
  pagePath,
  parsePageFromPathname,
} from './appRoute';

describe('appRoute', () => {
  beforeEach(() => {
    vi.stubGlobal('history', { replaceState: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds page paths from the current origin base', () => {
    expect(pagePath('mobile')).toMatch(/\/mobile$/);
    expect(buildAppUrl('mobile', 'track/interview-prep')).toMatch(/\/mobile#track\/interview-prep$/);
  });

  it('parses page segments from pathname', () => {
    expect(parsePageFromPathname('/mobile')).toBe('mobile');
    expect(parsePageFromPathname('/home')).toBe('home');
    expect(parsePageFromPathname('/')).toBeNull();
  });

  it('strips hash bodies', () => {
    expect(getHashBody('#track/foo')).toBe('track/foo');
    expect(getHashBody('')).toBe('');
  });

  it('migrates legacy mobile hashes to pathname routing', () => {
    vi.stubGlobal('location', {
      pathname: '/',
      search: '',
      hash: '#mobile/track/interview-prep/category/prep-arrays-all',
    });
    const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    normalizeLegacyUrl();
    expect(replace).toHaveBeenCalledWith(
      null,
      '',
      expect.stringMatching(/\/mobile#track\/interview-prep\/category\/prep-arrays-all$/),
    );
  });

  it('migrates legacy workspace share hashes', () => {
    vi.stubGlobal('location', {
      pathname: '/',
      search: '',
      hash: '#s=abc123',
    });
    const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    normalizeLegacyUrl();
    expect(replace).toHaveBeenCalledWith(null, '', expect.stringMatching(/\/workspace#s=abc123$/));
  });
});
