import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
  clampScrollTop,
  clampSelectionAfterReplace,
  createRecallMergeRefreshScheduler,
} from './scheduleRecallMergeRefresh';

describe('clampSelectionAfterReplace', () => {
  it('clamps positions beyond document length', () => {
    expect(clampSelectionAfterReplace(500, 600, 100)).toEqual({ anchor: 100, head: 100 });
  });

  it('preserves valid positions', () => {
    expect(clampSelectionAfterReplace(10, 20, 100)).toEqual({ anchor: 10, head: 20 });
  });

  it('clamps negative positions to zero', () => {
    expect(clampSelectionAfterReplace(-5, 10, 50)).toEqual({ anchor: 0, head: 10 });
  });

  it('handles empty document', () => {
    expect(clampSelectionAfterReplace(0, 0, 0)).toEqual({ anchor: 0, head: 0 });
  });
});

describe('clampScrollTop', () => {
  it('returns zero when content fits viewport', () => {
    expect(clampScrollTop(120, 400, 800)).toBe(0);
  });

  it('clamps scroll to max when content shrinks', () => {
    expect(clampScrollTop(900, 500, 400)).toBe(100);
  });

  it('never returns negative scroll', () => {
    expect(clampScrollTop(-50, 500, 400)).toBe(0);
  });
});

describe('EditorSelection with clamped range', () => {
  it('creates valid selection after bulk delete', () => {
    const { anchor, head } = clampSelectionAfterReplace(500, 500, 42);
    const sel = EditorSelection.single(anchor, head);
    expect(sel.main.anchor).toBe(42);
    expect(sel.main.head).toBe(42);
  });
});

describe('createRecallMergeRefreshScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid schedule calls into one refresh', () => {
    const refresh = vi.fn();
    const mockView = { reconfigure: refresh } as unknown as import('@codemirror/merge').MergeView;
    const scheduler = createRecallMergeRefreshScheduler(
      () => mockView,
      () => ({}),
    );

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(refresh).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });

  it('flush runs immediately and cancels pending debounce', () => {
    const refresh = vi.fn();
    const mockView = { reconfigure: refresh } as unknown as import('@codemirror/merge').MergeView;
    const scheduler = createRecallMergeRefreshScheduler(
      () => mockView,
      () => ({}),
    );

    scheduler.schedule();
    scheduler.flush();
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    expect(refresh).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });

  it('dispose prevents further refreshes', () => {
    const refresh = vi.fn();
    const mockView = { reconfigure: refresh } as unknown as import('@codemirror/merge').MergeView;
    const scheduler = createRecallMergeRefreshScheduler(
      () => mockView,
      () => ({}),
    );

    scheduler.schedule();
    scheduler.dispose();
    vi.advanceTimersByTime(50);
    expect(refresh).not.toHaveBeenCalled();
  });
});
