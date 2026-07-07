import { describe, expect, it, vi } from 'vitest';
import { buildGamesUrl, isGamesHash, parseGamesHash, writeGamesHash } from './gamesRoute';

describe('gamesRoute', () => {
  it('detects games pathname routes', () => {
    expect(isGamesHash('', '/games')).toBe(true);
    expect(isGamesHash('#room/ABCD', '/games')).toBe(true);
    expect(isGamesHash('#vim', '/vim')).toBe(false);
  });

  it('parses empty and room hashes', () => {
    expect(parseGamesHash('', '/games')).toEqual({});
    expect(parseGamesHash('#room/abcd', '/games')).toEqual({ room: 'ABCD' });
  });

  it('returns null for non-games routes', () => {
    expect(parseGamesHash('#home', '/home')).toBeNull();
  });

  it('buildGamesUrl includes room hash when provided', () => {
    vi.stubGlobal('location', { origin: 'http://localhost', search: '' });
    expect(buildGamesUrl('abcd')).toMatch(/#room\/ABCD$/);
    vi.unstubAllGlobals();
  });

  it('writeGamesHash is a safe no-op without a document location', () => {
    expect(() => writeGamesHash({ room: 'love' })).not.toThrow();
  });
});
