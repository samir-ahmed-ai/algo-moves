import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readLobbyPlayerName, writeLobbyPlayerName } from './lobbyPrefs';
import { STORAGE_KEYS } from '@/store/storageKeys';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

describe('lobbyPrefs persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists trimmed player display name', () => {
    writeLobbyPlayerName('  Ahmed  ');
    expect(readLobbyPlayerName()).toBe('Ahmed');
    expect(localStorage.getItem(STORAGE_KEYS.GAMES_NAME)).toBe('Ahmed');
  });
});
