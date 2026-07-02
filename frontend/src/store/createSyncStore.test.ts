import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncStore } from './createSyncStore';
import { readStorageJson } from './persistence/storage';

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

describe('createSyncStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('seeds its value from load()', () => {
    const store = createSyncStore('algo-moves:test', () => ({ n: 1 }));
    expect(store.get()).toEqual({ n: 1 });
  });

  it('set() persists via the default localStorage persister and updates get()', () => {
    const store = createSyncStore<{ n: number }>('algo-moves:test', () => ({ n: 1 }));
    store.set({ n: 2 });
    expect(store.get()).toEqual({ n: 2 });
    expect(readStorageJson('algo-moves:test', { n: 0 })).toEqual({ n: 2 });
  });

  it('update() derives the next value from the previous one', () => {
    const store = createSyncStore<number>('algo-moves:test', () => 10);
    store.update((prev) => prev + 5);
    expect(store.get()).toBe(15);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const store = createSyncStore<number>('algo-moves:test', () => 0);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(1);
    store.update((n) => n + 1);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.set(99);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('uses a custom persister when provided instead of localStorage', () => {
    const save = vi.fn();
    const store = createSyncStore<number>('algo-moves:test', () => 0, save);
    store.set(7);
    expect(save).toHaveBeenCalledWith(7);
    expect(localStorage.getItem('algo-moves:test')).toBeNull();
  });
});
