import { describe, expect, it, vi, beforeEach } from 'vitest';
import { arcadeFetch, isArcadeConfigured, resetArcadeConfiguredCache } from './arcadeClient';

describe('platform/api/arcadeClient', () => {
  beforeEach(() => {
    resetArcadeConfiguredCache();
    vi.restoreAllMocks();
  });

  it('isArcadeConfigured returns false when healthz fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(isArcadeConfigured()).resolves.toBe(false);
  });

  it('arcadeFetch returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(arcadeFetch('/api/test')).resolves.toBeNull();
  });

  it('arcadeFetch returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      }),
    );
    await expect(arcadeFetch<{ ok: boolean }>('/api/test', { auth: false })).resolves.toEqual({
      ok: true,
    });
  });
});
