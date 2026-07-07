import { describe, expect, it } from 'vitest';
import { isDojoHash, parseDojoHash } from './dojoRoute';

describe('dojoRoute', () => {
  it('parses empty dojo hash as the hub grid', () => {
    expect(parseDojoHash('', '/dojo')).toEqual({});
  });

  it('parses game routes', () => {
    expect(parseDojoHash('#g/backtrack', '/dojo')).toEqual({ gameId: 'backtrack' });
  });

  it('parses game + level routes', () => {
    expect(parseDojoHash('#g/toposort/ts-02', '/dojo')).toEqual({
      gameId: 'toposort',
      levelId: 'ts-02',
    });
  });

  it('ignores unknown hash shapes on the dojo route', () => {
    expect(parseDojoHash('#whatever/x', '/dojo')).toEqual({});
  });

  it('returns null for non-dojo routes', () => {
    expect(parseDojoHash('#g/backtrack', '/vim')).toBeNull();
  });

  it('detects dojo pathname routes', () => {
    expect(isDojoHash('#g/backtrack', '/dojo')).toBe(true);
    expect(isDojoHash('#level/basic-01', '/vim')).toBe(false);
  });
});
