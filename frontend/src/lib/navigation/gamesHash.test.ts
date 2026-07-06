import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildGamesUrl, isGamesHash, parseGamesHash, writeGamesHash } from './gamesHash';

describe('gamesHash', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognises the games route family', () => {
    expect(isGamesHash('', '/games')).toBe(true);
    expect(isGamesHash('#room/ABCD', '/games')).toBe(true);
    expect(isGamesHash('#games/room/ABCD')).toBe(true);
    expect(isGamesHash('#vim', '/vim')).toBe(false);
    expect(isGamesHash('#gamesX')).toBe(false);
  });

  it('parses a bare games route', () => {
    expect(parseGamesHash('', '/games')).toEqual({});
    expect(parseGamesHash('#games')).toEqual({});
  });

  it('parses and upper-cases a room code', () => {
    expect(parseGamesHash('#room/abcd', '/games')).toEqual({ room: 'ABCD' });
    expect(parseGamesHash('#games/room/abcd')).toEqual({ room: 'ABCD' });
  });

  it('returns null for non-games hashes', () => {
    expect(parseGamesHash('#home', '/home')).toBeNull();
  });

  it('writeGamesHash is a safe no-op without a document location', () => {
    expect(() => writeGamesHash({ room: 'love' })).not.toThrow();
  });

  it('builds a shareable url with a room', () => {
    vi.stubGlobal('location', { origin: 'https://test.app', pathname: '/games', search: '' });
    expect(buildGamesUrl('wxyz')).toBe('https://test.app/games#room/WXYZ');
  });
});
