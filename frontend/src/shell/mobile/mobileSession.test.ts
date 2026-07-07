import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearMobileSession, loadMobileSession, saveMobileSession } from './mobileSession';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  } as Storage;
}

describe('mobileSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('round-trips session data', () => {
    saveMobileSession({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
      pIdx: 2,
      cIdx: 1,
    });
    expect(loadMobileSession()).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
      pIdx: 2,
      cIdx: 1,
      updatedAt: Date.now(),
    });
  });

  it('clears session', () => {
    saveMobileSession({ topicId: 'graphs', pIdx: 0, cIdx: 0 });
    clearMobileSession();
    expect(loadMobileSession()).toBeNull();
  });

  it('expires sessions after seven days', () => {
    saveMobileSession({ topicId: 'graphs', pIdx: 1, cIdx: 0 });
    vi.setSystemTime(new Date('2026-01-09T12:00:00Z'));
    expect(loadMobileSession()).toBeNull();
  });

  it('keeps session for Continue after partial progress', () => {
    saveMobileSession({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
      pIdx: 2,
      cIdx: 1,
    });
    expect(loadMobileSession()?.pIdx).toBe(2);
    expect(loadMobileSession()?.cIdx).toBe(1);
  });
});
