import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CanvasMode } from '@/core';
import { ModeRouter, resolveRuntimeErrorRecovery, type ModeRouterProps } from './ModeRouter';
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
    {
      activeTrackId: 'data-structures',
      activeCategoryId: 'two-pointers',
      expected: 'category-board',
    },
    { activeTrackId: null, activeCategoryId: 'two-pointers', expected: 'category-board' },
  ] as const)(
    'routes browsing state to $expected',
    ({ activeTrackId, activeCategoryId, expected }) => {
      expect(surface({ activeTrackId, activeCategoryId, problemFocused: false })).toBe(expected);
    },
  );

  it('routes problem-backed visualize mode to the canvas surface', () => {
    expect(surface({ mode: 'visualize' })).toBe('canvas');
  });

  it('keeps the free canvas path available when no problem is focused', () => {
    expect(surface({ problemFocused: false, mode: 'visualize', ready: false })).toBe('canvas');
  });

  it.each([
    { pluginLoading: true, expected: 'loading' },
    { runtimeError: true, expected: 'error' },
    { pluginLoading: false, expected: 'empty' },
  ] as const)(
    'routes unavailable problem-backed visualize mode to $expected',
    ({ pluginLoading, runtimeError, expected }) => {
      expect(
        surface({ mode: 'visualize', ready: false, pluginLoading: !!pluginLoading, runtimeError }),
      ).toBe(expected);
    },
  );

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
  ] as const)(
    'routes fallback actions to $expected',
    ({ activeTrackId, activeCategoryId, expected }) => {
      expect(resolveWorkspaceFallbackTarget({ activeTrackId, activeCategoryId })).toBe(expected);
    },
  );
});

describe('resolveRuntimeErrorRecovery', () => {
  it.each([
    {
      input: { customInput: { nums: [1] }, inputId: 'sample', firstInputId: 'sample' },
      expected: 'reset-custom-input',
    },
    {
      input: { customInput: null, inputId: 'other', firstInputId: 'sample' },
      expected: 'first-sample',
    },
    { input: { customInput: null, inputId: 'sample', firstInputId: 'sample' }, expected: 'none' },
    { input: { customInput: null, inputId: 'sample', firstInputId: undefined }, expected: 'none' },
  ] as const)('returns $expected', ({ input, expected }) => {
    expect(resolveRuntimeErrorRecovery(input)).toBe(expected);
  });
});

describe('ModeRouter fallbacks', () => {
  const plugin: NonNullable<ModeRouterProps['plugin']> = {
    meta: {
      id: 'demo',
      title: 'Demo',
      difficulty: 'Easy',
      tags: [],
      summary: 'Demo',
    },
    inputs: [
      { id: 'sample', label: 'Sample', value: 1 },
      { id: 'other', label: 'Other', value: 2 },
    ],
    record: () => [],
    View: () => null,
  };

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
    runtimeError: null,
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
    const html = renderToStaticMarkup(
      createElement(ModeRouter, { ...props, activeCategoryId: 'arrays', pluginLoading: false }),
    );
    expect(html).toContain('Preview unavailable');
    expect(html).toContain('not bound to an interactive preview');
    expect(html).toContain('Back to catalog');
  });

  it('renders recorder failures as a runtime error state', () => {
    const html = renderToStaticMarkup(
      createElement(ModeRouter, { ...props, pluginLoading: false, runtimeError: 'bad input' }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('Preview could not render');
    expect(html).toContain('bad input');
  });

  it('offers to reset custom input after recorder failures', () => {
    const html = renderToStaticMarkup(
      createElement(ModeRouter, {
        ...props,
        plugin,
        pluginLoading: false,
        customInput: { nums: [1] },
        runtimeError: 'bad input',
      }),
    );
    expect(html).toContain('Reset custom input');
  });

  it('offers to use the first sample after a selected sample fails', () => {
    const html = renderToStaticMarkup(
      createElement(ModeRouter, {
        ...props,
        plugin,
        pluginLoading: false,
        inputId: 'other',
        runtimeError: 'bad input',
      }),
    );
    expect(html).toContain('Use first sample');
  });

  it('sends unavailable standalone context back home', () => {
    const html = renderToStaticMarkup(
      createElement(ModeRouter, { ...props, pluginLoading: false }),
    );
    expect(html).toContain('Preview unavailable');
    expect(html).toContain('Go home');
  });
});
