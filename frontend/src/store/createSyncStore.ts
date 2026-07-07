import { useSyncExternalStore } from 'react';
import { writeStorageJson } from '@/store/persistence/storage';

type StoreListener = () => void;
type StoreSaver<T> = (value: T) => void;

export interface SyncStore<T> {
  /** Current value (synchronous). */
  get(): T;
  /** Replace the value, persist it, and notify subscribers. */
  set(next: T): void;
  /** Functional update: derive the next value from the current one. */
  update(recipe: (prev: T) => T): void;
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** React hook returning the current value, re-rendering on every change. */
  use(): T;
}

/**
 * A tiny localStorage-backed external store built on `useSyncExternalStore`.
 *
 * Collapses the `load` + listeners-Set + `commit` + `subscribe` + hook boilerplate
 * that each persisted store domain used to reimplement by hand. Domain-specific
 * hydration/validation lives in the `load` callback; domain-specific mutations are
 * thin wrappers around `set`/`update`.
 *
 * @param key   storage key (from STORAGE_KEYS) used by the default persister
 * @param load  produces the initial value — do any validation/clamping here
 * @param save  optional custom persister; defaults to `writeStorageJson(key, value)`
 */
export function createSyncStore<T>(
  key: string,
  load: () => T,
  save: StoreSaver<T> = (value) => writeStorageJson(key, value),
): SyncStore<T> {
  let data = load();
  const listeners = new Set<StoreListener>();

  const notify = (): void => {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // keep other subscribers live
      }
    }
  };

  const get = (): T => data;
  const set = (next: T): void => {
    if (Object.is(data, next)) return;
    data = next;
    try {
      save(next);
    } catch {
      // persistence failures should not break in-memory state
    }
    notify();
  };
  const update = (recipe: (prev: T) => T): void => set(recipe(data));
  const subscribe = (listener: StoreListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const use = (): T => useSyncExternalStore(subscribe, get, get);

  return { get, set, update, subscribe, use };
}
