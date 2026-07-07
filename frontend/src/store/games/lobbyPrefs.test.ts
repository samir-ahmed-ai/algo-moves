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
    writeLobbyPlayerName('  Ahmed   Player  ');
    expect(readLobbyPlayerName()).toBe('Ahmed Player');
    expect(localStorage.getItem(STORAGE_KEYS.GAMES_NAME)).toBe('Ahmed Player');
  });

  it('clears a saved player display name when the next value is blank', () => {
    writeLobbyPlayerName('Ahmed');
    writeLobbyPlayerName('   ');
    expect(readLobbyPlayerName()).toBe('');
    expect(localStorage.getItem(STORAGE_KEYS.GAMES_NAME)).toBeNull();
  });
});
