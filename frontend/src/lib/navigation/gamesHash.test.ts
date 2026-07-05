import { describe, expect, it } from 'vitest';
import { buildGamesUrl, isGamesHash, parseGamesHash, writeGamesHash } from './gamesHash';

describe('gamesHash', () => {
  it('recognises the games route family', () => {
    expect(isGamesHash('#games')).toBe(true);
    expect(isGamesHash('#games/room/ABCD')).toBe(true);
    expect(isGamesHash('#vim')).toBe(false);
    expect(isGamesHash('#gamesX')).toBe(false);
  });

  it('parses a bare games route', () => {
    expect(parseGamesHash('#games')).toEqual({});
  });

  it('parses and upper-cases a room code', () => {
    expect(parseGamesHash('#games/room/abcd')).toEqual({ room: 'ABCD' });
  });

  it('returns null for non-games hashes', () => {
    expect(parseGamesHash('#home')).toBeNull();
  });

  it('writeGamesHash is a safe no-op without a document location', () => {
    // vitest runs in a Node environment (no DOM); the guard should keep this from throwing.
    expect(() => writeGamesHash({ room: 'love' })).not.toThrow();
  });

  it('builds a shareable url with a room', () => {
    expect(buildGamesUrl('wxyz')).toContain('#games/room/WXYZ');
  });
});
