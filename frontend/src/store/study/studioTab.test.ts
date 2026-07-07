import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readStudioTab, writeStudioTab } from './studioTab';
import { STORAGE_KEYS } from '@/store/storageKeys';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

describe('studioTab persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads and writes per-item active tab ids', () => {
    writeStudioTab('two-sum', 'quiz');
    expect(readStudioTab('two-sum')).toBe('quiz');
    expect(localStorage.getItem(`${STORAGE_KEYS.STUDIO_TAB}:two-sum`)).toBe('quiz');
  });

  it('normalizes blank and padded tab ids', () => {
    writeStudioTab(' two-sum ', ' quiz ');
    expect(readStudioTab('two-sum')).toBe('quiz');

    writeStudioTab('two-sum', '   ');
    expect(readStudioTab('two-sum')).toBe('quiz');
    expect(readStudioTab('   ')).toBeNull();
  });
});
