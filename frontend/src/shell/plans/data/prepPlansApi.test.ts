import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPrepPlan,
  deletePrepPlan,
  getPrepPlan,
  listPrepPlans,
  updatePrepPlan,
} from './prepPlansApi';

vi.mock('@/platform', () => ({
  arcadeFetch: vi.fn(),
}));

import { arcadeFetch } from '@/platform';

const mockFetch = vi.mocked(arcadeFetch);

describe('prepPlansApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('lists prep plans', async () => {
    mockFetch.mockResolvedValue([
      { id: 'p1', title: 'Comcast', itemCount: 2, completedCount: 1, updatedAt: 't' },
    ]);
    const rows = await listPrepPlans();
    expect(mockFetch).toHaveBeenCalledWith('/api/prep-plans');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Comcast');
  });

  it('creates a prep plan', async () => {
    mockFetch.mockResolvedValue({ id: 'p1', title: 'New plan', items: [] });
    const plan = await createPrepPlan('New plan', ['two-sum']);
    expect(mockFetch).toHaveBeenCalledWith('/api/prep-plans', {
      method: 'POST',
      body: JSON.stringify({ title: 'New plan', itemIds: ['two-sum'] }),
    });
    expect(plan?.id).toBe('p1');
  });

  it('gets a prep plan by id', async () => {
    mockFetch.mockResolvedValue({ id: 'p1', title: 'Plan' });
    const plan = await getPrepPlan('p1');
    expect(mockFetch).toHaveBeenCalledWith('/api/prep-plans/p1');
    expect(plan?.title).toBe('Plan');
  });

  it('updates a prep plan', async () => {
    mockFetch.mockResolvedValue({ id: 'p1', title: 'Updated' });
    const plan = await updatePrepPlan('p1', { title: 'Updated', itemIds: ['a', 'b'] });
    expect(mockFetch).toHaveBeenCalledWith('/api/prep-plans/p1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', itemIds: ['a', 'b'] }),
    });
    expect(plan?.title).toBe('Updated');
  });

  it('deletes a prep plan', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const ok = await deletePrepPlan('p1');
    expect(mockFetch).toHaveBeenCalledWith('/api/prep-plans/p1', { method: 'DELETE' });
    expect(ok).toBe(true);
  });
});
