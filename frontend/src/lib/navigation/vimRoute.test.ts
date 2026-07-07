import { describe, expect, it } from 'vitest';
import { isVimHash, parseVimHash } from './vimRoute';

describe('vimRoute', () => {
  it('parses empty vim hash on pathname route', () => {
    expect(parseVimHash('', '/vim')).toEqual({});
  });

  it('parses level routes', () => {
    expect(parseVimHash('#level/basic-01', '/vim')).toEqual({ levelId: 'basic-01' });
  });

  it('returns null for non-vim routes', () => {
    expect(parseVimHash('#home', '/home')).toBeNull();
  });

  it('detects vim pathname routes', () => {
    expect(isVimHash('#level/find-01', '/vim')).toBe(true);
    expect(isVimHash('#mobile', '/mobile')).toBe(false);
  });
});
