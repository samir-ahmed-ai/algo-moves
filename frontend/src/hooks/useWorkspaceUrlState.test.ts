/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { decodeShare, encodeShare, type ShareState } from '@/store/navigation/shareState';
import { useWorkspaceUrlState } from './useWorkspaceUrlState';

vi.mock('@/store/workspace', () => ({
  useWorkspace: vi.fn(),
  normalizeThemePreset: (v: string) => v,
}));

import { useWorkspace } from '@/store/workspace';

const mockUseWorkspace = vi.mocked(useWorkspace);

function mockWorkspace(overrides: Partial<ReturnType<typeof useWorkspace>> = {}) {
  mockUseWorkspace.mockReturnValue({
    openProblem: vi.fn(),
    enterCanvas: vi.fn(),
    setMode: vi.fn(),
    setTheme: vi.fn(),
    setPalette: vi.fn(),
    setThemePreset: vi.fn(),
    setDir: vi.fn(),
    canvasProject: null,
    canvasVariant: 'plain',
    mode: 'visualize',
    theme: 'dark',
    palette: 'default',
    themePreset: 'aurora',
    dir: 'LR',
    problemFocused: false,
    ...overrides,
  } as ReturnType<typeof useWorkspace>);
}

function setShareHash(state: ShareState) {
  history.replaceState(null, '', `/workspace#s=${encodeShare(state)}`);
}

function readWrittenShare(): ShareState | null {
  const raw = location.hash.split('#s=')[1];
  return raw ? decodeShare(raw) : null;
}

describe('useWorkspaceUrlState share rewriting', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/workspace');
  });

  it('preserves room, sessionKind, and guestToken across hash rewrites', () => {
    setShareHash({
      mode: 'visualize',
      focus: 'canvas',
      room: 'ROOM1234',
      sessionKind: 'interview',
      guestToken: 'tok_abc',
    });
    mockWorkspace({ canvasVariant: 'interview' });
    renderHook(() => useWorkspaceUrlState(undefined, ''));

    const share = readWrittenShare();
    expect(share?.room).toBe('ROOM1234');
    expect(share?.sessionKind).toBe('interview');
    expect(share?.guestToken).toBe('tok_abc');
  });

  it('writes variant=interview for the standalone interview canvas', () => {
    setShareHash({ mode: 'visualize', focus: 'canvas' });
    mockWorkspace({ canvasVariant: 'interview' });
    renderHook(() => useWorkspaceUrlState(undefined, ''));

    const share = readWrittenShare();
    expect(share?.focus).toBe('canvas');
    expect(share?.variant).toBe('interview');
  });

  it('omits variant for the plain standalone canvas', () => {
    setShareHash({ mode: 'visualize', focus: 'canvas' });
    mockWorkspace({ canvasVariant: 'plain' });
    renderHook(() => useWorkspaceUrlState(undefined, ''));

    const share = readWrittenShare();
    expect(share?.focus).toBe('canvas');
    expect(share && 'variant' in share).toBe(false);
  });

  it('keeps guestToken and omits variant on the problem-focused path', () => {
    setShareHash({
      item: 'two-sum',
      mode: 'learn',
      focus: 'problem',
      room: 'ROOM1234',
      guestToken: 'tok_abc',
    });
    mockWorkspace({ mode: 'learn', problemFocused: true });
    renderHook(() => useWorkspaceUrlState(undefined, 'two-sum'));

    const share = readWrittenShare();
    expect(share?.focus).toBe('problem');
    expect(share?.guestToken).toBe('tok_abc');
    expect(share?.room).toBe('ROOM1234');
    expect(share && 'variant' in share).toBe(false);
  });
});
