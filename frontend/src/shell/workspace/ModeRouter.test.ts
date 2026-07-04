import { describe, expect, it } from 'vitest';
import type { CanvasMode } from '@/core';
import { resolveWorkspaceSurface } from './surface';

describe('resolveWorkspaceSurface', () => {
  function surface(overrides: Partial<Parameters<typeof resolveWorkspaceSurface>[0]> = {}) {
    return resolveWorkspaceSurface({
      activeTrackId: null,
      activeCategoryId: null,
      problemFocused: true,
      mode: 'learn',
      ready: true,
      pluginLoading: false,
      ...overrides,
    });
  }

  it.each([
    { activeTrackId: 'arrays', activeCategoryId: null, expected: 'track-board' },
    { activeTrackId: 'arrays', activeCategoryId: 'two-pointers', expected: 'category-board' },
    { activeTrackId: null, activeCategoryId: 'two-pointers', expected: 'category-board' },
  ] as const)('routes browsing state to $expected', ({ activeTrackId, activeCategoryId, expected }) => {
    expect(surface({ activeTrackId, activeCategoryId, problemFocused: false })).toBe(expected);
  });

  it('routes problem-backed visualize mode to the canvas surface', () => {
    expect(surface({ mode: 'visualize' })).toBe('canvas');
  });

  it('keeps the free canvas path available when no problem is focused', () => {
    expect(surface({ problemFocused: false, mode: 'visualize', ready: false })).toBe('canvas');
  });

  it.each([
    { pluginLoading: true, expected: 'loading' },
    { pluginLoading: false, expected: 'empty' },
  ] as const)('routes unavailable problem-backed visualize mode to $expected', ({ pluginLoading, expected }) => {
    expect(surface({ mode: 'visualize', ready: false, pluginLoading })).toBe(expected);
  });

  it.each([
    { mode: 'play' as CanvasMode, expected: 'play' },
    { mode: 'learn' as CanvasMode, expected: 'learn' },
  ] as const)('routes ready $mode mode to $expected', ({ mode, expected }) => {
    expect(surface({ mode })).toBe(expected);
  });

  it.each([
    { pluginLoading: true, expected: 'loading' },
    { pluginLoading: false, expected: 'empty' },
  ] as const)('routes unavailable study mode to $expected', ({ pluginLoading, expected }) => {
    expect(surface({ mode: 'play', ready: false, pluginLoading })).toBe(expected);
  });
});
