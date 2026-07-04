import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CanvasMode } from '@/core';
import { ModeRouter, type ModeRouterProps } from './ModeRouter';
import { resolveWorkspaceFallbackTarget, resolveWorkspaceSurface } from './surface';

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
    { activeTrackId: 'data-structures', activeCategoryId: null, expected: 'track-board' },
    { activeTrackId: 'data-structures', activeCategoryId: 'two-pointers', expected: 'category-board' },
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

describe('resolveWorkspaceFallbackTarget', () => {
  it.each([
    { activeTrackId: 'data-structures', activeCategoryId: null, expected: 'catalog' },
    { activeTrackId: null, activeCategoryId: 'arrays', expected: 'catalog' },
    { activeTrackId: null, activeCategoryId: null, expected: 'home' },
  ] as const)('routes fallback actions to $expected', ({ activeTrackId, activeCategoryId, expected }) => {
    expect(resolveWorkspaceFallbackTarget({ activeTrackId, activeCategoryId })).toBe(expected);
  });
});

describe('ModeRouter fallbacks', () => {
  const props: ModeRouterProps = {
    activeTrackId: null,
    activeCategoryId: null,
    problemFocused: true,
    mode: 'learn',
    pluginLoading: true,
    plugin: null,
    item: {
      id: 'missing',
      kind: 'problem',
      title: 'Missing problem',
      pluginId: 'missing',
      tags: [],
      status: 'todo',
      prereqs: [],
      courseId: 'data-structures',
      topicId: 'arrays',
    },
    inputId: 'sample',
    selectInput: () => {},
    customInput: null,
    setCustomInput: () => {},
    frames: [],
    player: {} as ModeRouterProps['player'],
    frame: undefined,
    backToBrowse: () => {},
    goHome: () => {},
  };

  it('renders a loading state instead of a blank workspace', () => {
    const html = renderToStaticMarkup(createElement(ModeRouter, props));
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading Missing problem');
    expect(html).toContain('Preparing the workspace');
  });

  it('renders an unavailable state instead of a blank workspace', () => {
    const html = renderToStaticMarkup(createElement(ModeRouter, { ...props, activeCategoryId: 'arrays', pluginLoading: false }));
    expect(html).toContain('Preview unavailable');
    expect(html).toContain('not bound to an interactive preview');
    expect(html).toContain('Back to catalog');
  });

  it('sends unavailable standalone context back home', () => {
    const html = renderToStaticMarkup(createElement(ModeRouter, { ...props, pluginLoading: false }));
    expect(html).toContain('Preview unavailable');
    expect(html).toContain('Go home');
  });
});
