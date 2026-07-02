import { useSyncExternalStore } from 'react';
import { writeStorageJson } from '@/store/persistence/storage';

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
  save: (value: T) => void = (value) => writeStorageJson(key, value),
): SyncStore<T> {
  let data = load();
  const listeners = new Set<() => void>();

  const get = (): T => data;
  const set = (next: T): void => {
    data = next;
    save(next);
    listeners.forEach((l) => l());
  };
  const update = (recipe: (prev: T) => T): void => set(recipe(data));
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const use = (): T => useSyncExternalStore(subscribe, get, get);

  return { get, set, update, subscribe, use };
}
