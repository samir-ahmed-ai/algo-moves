import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildShareUrl, encodeShare, readShareFromUrl, writeShareToUrl } from './shareState';

describe('shareState', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      origin: 'https://example.test',
      pathname: '/algo-moves/',
      search: '?debug=1',
      hash: '#mobile',
    });
    vi.stubGlobal('history', {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds share URL with encoded payload', () => {
    const payload = { item: 'two-sum', mode: 'play', theme: 'dark', dir: 'LR' };
    expect(buildShareUrl(payload)).toBe(`https://example.test/algo-moves/#s=${encodeShare(payload)}`);
  });

  it('merges share state into existing hash and reads it back', () => {
    const payload = { item: 'two-sum', mode: 'play', theme: 'dark', dir: 'LR' };
    const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    writeShareToUrl(payload);
    const next = replace.mock.calls[0]?.[2];
    const hash = typeof next === 'string' && next.includes('#') ? next.slice(next.indexOf('#')) : '#';
    expect(hash.startsWith('#mobile')).toBe(true);
    expect(hash.includes('s=')).toBe(true);
    location.hash = hash;
    expect(readShareFromUrl()).toEqual(payload);
  });
});
