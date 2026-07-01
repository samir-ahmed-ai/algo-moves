import { describe, it, expect } from 'vitest';
import { isVimStudioMobile, VIM_NARROW_BREAKPOINT } from './layoutMode';

describe('layoutMode', () => {
  it('uses desktop studio layout at or above breakpoint', () => {
    expect(isVimStudioMobile(VIM_NARROW_BREAKPOINT)).toBe(false);
    expect(isVimStudioMobile(VIM_NARROW_BREAKPOINT + 100)).toBe(false);
  });

  it('uses mobile layout below breakpoint', () => {
    expect(isVimStudioMobile(VIM_NARROW_BREAKPOINT - 1)).toBe(true);
    expect(isVimStudioMobile(400)).toBe(true);
  });

  it('defaults to desktop when width is zero', () => {
    expect(isVimStudioMobile(0)).toBe(false);
  });
});
