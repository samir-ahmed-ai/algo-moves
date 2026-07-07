import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import {
  COMMAND_PALETTE_RECENT_LIMIT,
  pushRecentCommandId,
  readCommandPaletteRecentIds,
  recordCommandPaletteRecentId,
} from './commandPaletteHistory';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  } as Storage;
}

describe('commandPaletteHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads an empty recent-command list by default', () => {
    expect(readCommandPaletteRecentIds()).toEqual([]);
  });

  it('deduplicates commands and keeps the newest command first', () => {
    expect(pushRecentCommandId(['mode:play', 'settings', 'share'], 'settings')).toEqual([
      'settings',
      'mode:play',
      'share',
    ]);
  });

  it('caps the recent-command list', () => {
    const seeded = Array.from(
      { length: COMMAND_PALETTE_RECENT_LIMIT },
      (_, index) => `command-${index}`,
    );
    expect(pushRecentCommandId(seeded, 'new-command')).toHaveLength(COMMAND_PALETTE_RECENT_LIMIT);
    expect(pushRecentCommandId(seeded, 'new-command')).toEqual([
      'new-command',
      ...seeded.slice(0, COMMAND_PALETTE_RECENT_LIMIT - 1),
    ]);
  });

  it('persists command usage', () => {
    recordCommandPaletteRecentId('mode:play');
    recordCommandPaletteRecentId('settings');
    recordCommandPaletteRecentId('mode:play');

    expect(readStorageJson(STORAGE_KEYS.COMMAND_PALETTE_RECENTS, [])).toEqual([
      'mode:play',
      'settings',
    ]);
  });
});
