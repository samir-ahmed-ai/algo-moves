import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readStorageJson,
  readStorageText,
  removeStorageValue,
  writeStorageJson,
  writeStorageText,
} from './storage';

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

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads and writes text values', () => {
    writeStorageText('k', 'v');
    expect(readStorageText('k', 'fallback')).toBe('v');
  });

  it('falls back when storage key is missing', () => {
    expect(readStorageText('missing', 'fallback')).toBe('fallback');
  });

  it('reads and writes JSON values', () => {
    writeStorageJson('obj', { done: true });
    const parsed = readStorageJson<{ done: boolean }>(
      'obj',
      { done: false },
      (value): value is { done: boolean } => {
        return !!value && typeof value === 'object' && (value as { done?: unknown }).done === true;
      },
    );
    expect(parsed).toEqual({ done: true });
  });

  it('falls back when JSON is malformed', () => {
    const bad = {
      length: 0,
      key: () => null,
      getItem: () => '{bad',
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    } as Storage;
    vi.stubGlobal('localStorage', bad);
    expect(
      readStorageJson('obj', { done: false }, (v): v is { done: boolean } => {
        return !!v && typeof v === 'object' && (v as { done?: unknown }).done === true;
      }),
    ).toEqual({ done: false });
  });

  it('removes stored values', () => {
    writeStorageText('remove-me', 'yes');
    expect(readStorageText('remove-me', null)).toBe('yes');
    removeStorageValue('remove-me');
    expect(readStorageText('remove-me', null)).toBeNull();
  });
});
