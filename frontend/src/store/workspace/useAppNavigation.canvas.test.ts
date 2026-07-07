/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAppNavigation } from './useAppNavigation';

describe('useAppNavigation canvas variant', () => {
  it('defaults to the plain canvas variant', () => {
    const { result } = renderHook(() => useAppNavigation(null));
    expect(result.current.canvasVariant).toBe('plain');
  });

  it('enterCollabCanvas opens the interview-seeded canvas', () => {
    const { result } = renderHook(() => useAppNavigation(null));
    act(() => result.current.enterCollabCanvas());
    expect(result.current.canvasVariant).toBe('interview');
    expect(result.current.route).toBe('workspace');
    expect(result.current.mode).toBe('visualize');
    expect(result.current.problemFocused).toBe(false);
  });

  it('enterCanvas resets back to the plain variant', () => {
    const { result } = renderHook(() => useAppNavigation(null));
    act(() => result.current.enterCollabCanvas());
    expect(result.current.canvasVariant).toBe('interview');
    act(() => result.current.enterCanvas());
    expect(result.current.canvasVariant).toBe('plain');
  });
});
