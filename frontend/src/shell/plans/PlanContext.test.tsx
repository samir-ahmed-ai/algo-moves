/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlanProvider, usePlan } from './PlanContext';
import type { PrepPlan } from './data/prepPlansApi';

vi.mock('@/shell/auth/AuthProvider', () => ({
  useAuth: () => ({ configured: true, isAnonymous: false, userId: 'user-1' }),
}));

vi.mock('./data/prepPlansApi', () => ({
  getPrepPlan: vi.fn(),
  updatePrepPlan: vi.fn(),
}));

import { getPrepPlan, updatePrepPlan } from './data/prepPlansApi';

const mockGet = vi.mocked(getPrepPlan);
const mockUpdate = vi.mocked(updatePrepPlan);

const samplePlan: PrepPlan = {
  id: 'plan-1',
  ownerProfileId: 'user-1',
  title: 'Comcast prep',
  notes: '',
  items: [
    { itemId: 'two-sum', position: 0, completed: false },
    { itemId: 'lru-cache', position: 1, completed: true },
  ],
  createdAt: '2026-07-06T00:00:00Z',
  updatedAt: '2026-07-06T00:00:00Z',
};

function wrapper({ children }: { children: ReactNode }) {
  return <PlanProvider>{children}</PlanProvider>;
}

describe('PlanContext', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockUpdate.mockReset();
    mockGet.mockResolvedValue(samplePlan);
    mockUpdate.mockImplementation(async (_id, patch) => ({
      ...samplePlan,
      title: patch.title ?? samplePlan.title,
      items: (patch.itemIds ?? samplePlan.items.map((i) => i.itemId)).map((itemId, position) => ({
        itemId,
        position,
        completed:
          patch.completedItems?.includes(itemId) ??
          samplePlan.items.some((i) => i.itemId === itemId && i.completed),
      })),
    }));
    localStorage.clear();
  });

  it('loads a plan and exposes ordered item ids', async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await act(async () => {
      await result.current.loadPlan('plan-1');
    });
    expect(result.current.isBuilding).toBe(true);
    expect(result.current.itemIds).toEqual(['two-sum', 'lru-cache']);
    expect(result.current.completed.has('lru-cache')).toBe(true);
  });

  it('adds and removes items while building', async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await act(async () => {
      await result.current.loadPlan('plan-1');
    });

    act(() => {
      result.current.addItem('merge-intervals');
    });
    expect(result.current.hasItem('merge-intervals')).toBe(true);
    expect(result.current.itemIds).toEqual(['two-sum', 'lru-cache', 'merge-intervals']);

    act(() => {
      result.current.removeItem('lru-cache');
    });
    expect(result.current.hasItem('lru-cache')).toBe(false);
    expect(result.current.itemIds).toEqual(['two-sum', 'merge-intervals']);
  });

  it('reorders items', async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await act(async () => {
      await result.current.loadPlan('plan-1');
    });

    act(() => {
      result.current.reorderItem(0, 1);
    });
    expect(result.current.itemIds).toEqual(['lru-cache', 'two-sum']);
  });

  it('debounces save after edits', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePlan(), { wrapper });
      await act(async () => {
        await result.current.loadPlan('plan-1');
      });

      act(() => {
        result.current.addItem('merge-intervals');
      });

      expect(mockUpdate).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockUpdate).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
