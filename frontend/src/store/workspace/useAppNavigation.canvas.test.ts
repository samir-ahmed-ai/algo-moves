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

  it('boots into the interview variant from a canvas share with variant=interview', () => {
    const { result } = renderHook(() =>
      useAppNavigation({ mode: 'visualize', focus: 'canvas', variant: 'interview' }),
    );
    expect(result.current.canvasVariant).toBe('interview');
    expect(result.current.route).toBe('workspace');
    expect(result.current.mode).toBe('visualize');
    expect(result.current.problemFocused).toBe(false);
  });

  it('boots into the interview variant from an interview invite (sessionKind hint)', () => {
    const { result } = renderHook(() =>
      useAppNavigation({
        mode: 'visualize',
        focus: 'canvas',
        room: 'ROOM1234',
        sessionKind: 'interview',
        guestToken: 'tok_abc',
      }),
    );
    expect(result.current.canvasVariant).toBe('interview');
  });

  it('stays plain for a canvas share without interview hints', () => {
    const { result } = renderHook(() => useAppNavigation({ mode: 'visualize', focus: 'canvas' }));
    expect(result.current.canvasVariant).toBe('plain');
  });

  it('ignores interview hints when focus is not canvas', () => {
    const { result } = renderHook(() =>
      useAppNavigation({ focus: 'problem', variant: 'interview', sessionKind: 'interview' }),
    );
    expect(result.current.canvasVariant).toBe('plain');
  });
});
