import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildAppUrl, getHashBody, pagePath, parsePageFromPathname } from './appRoute';

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
    expect(buildAppUrl('mobile', 'track/interview-prep')).toMatch(
      /\/mobile#track\/interview-prep$/,
    );
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
});
