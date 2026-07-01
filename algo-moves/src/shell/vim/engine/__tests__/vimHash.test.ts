import { describe, it, expect } from 'vitest';
import { isVimHash, parseVimHash } from '../vimHash';

describe('vimHash', () => {
  it('parses bare vim hash', () => {
    expect(parseVimHash('#vim')).toEqual({});
  });

  it('parses level deep link', () => {
    expect(parseVimHash('#vim/level/basic-01')).toEqual({ levelId: 'basic-01' });
  });

  it('returns null for non-vim hash', () => {
    expect(parseVimHash('#home')).toBeNull();
  });

  it('detects vim hash prefix', () => {
    expect(isVimHash('#vim/level/find-01')).toBe(true);
    expect(isVimHash('#mobile')).toBe(false);
  });
});
