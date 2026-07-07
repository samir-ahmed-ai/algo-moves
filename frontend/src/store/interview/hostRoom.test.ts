import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clearInterviewHostRoom,
  isPersistedInterviewHostRoom,
  markInterviewHostRoom,
} from './hostRoom';
import { STORAGE_KEYS } from '@/store/storageKeys';

const LEGACY_INTERVIEW_HOST_KEY = 'algo-moves-interview-host';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

describe('hostRoom persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks and clears host room by normalized code', () => {
    markInterviewHostRoom(' abcd ');
    expect(isPersistedInterviewHostRoom('abcd')).toBe(true);
    expect(isPersistedInterviewHostRoom('ABCD')).toBe(true);
    clearInterviewHostRoom();
    expect(isPersistedInterviewHostRoom('ABCD')).toBe(false);
  });

  it('migrates legacy interview host key on read', () => {
    localStorage.setItem(LEGACY_INTERVIEW_HOST_KEY, 'wxyz');
    expect(isPersistedInterviewHostRoom('WXYZ')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.INTERVIEW_HOST_ROOM)).toBe('WXYZ');
    expect(localStorage.getItem(LEGACY_INTERVIEW_HOST_KEY)).toBeNull();
  });
});
