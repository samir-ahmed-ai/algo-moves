import type { SyncStore } from '@/store/createSyncStore';
import { writeStorageJson } from '@/store/persistence/storage';
import { isSyncActive, registerSync } from './syncSession';

/**
 * Turns a localStorage-backed store into an offline-first, server-synced one by
 * supplying a drop-in `save` for `createSyncStore(key, load, save)`. The contract:
 *
 *  - `save` writes localStorage synchronously first (unchanged offline behavior),
 *    then — only when sync is active and we are not applying a server value — fires
 *    a debounced background push. Guests / offline users never reach the push branch.
 *  - `hydrate` (on sign-in) pulls server state, merges it with local, applies the
 *    result under a suppress flag (so the resulting `set` never re-triggers a push),
 *    and does one explicit converge push so server gets any local-newer records.
 *
 * The suppress flag + once-per-userId hydrate + single explicit converge push are
 * what prevent a pull→save→push loop.
 */
export interface ServerSyncConfig<T> {
  key: string;
  /** Server truth as the store's value, or null when the backend is unavailable. */
  pull: () => Promise<T | null>;
  /** Push the store's value; return value ignored (server is the merge authority). */
  push: (value: T) => Promise<unknown>;
  /** Pure merge of local and remote — must match the server's ON CONFLICT merge. */
  merge: (local: T, remote: T) => T;
  debounceMs?: number;
}

export interface ServerSync<T> {
  /** Pass as the third arg to createSyncStore. */
  save: (value: T) => void;
  /** Wire the created store back in (needed for push/applyRemote). */
  attach: (store: SyncStore<T>) => void;
  hydrate: () => Promise<void>;
  flush: () => void;
}

export function createServerSync<T>(config: ServerSyncConfig<T>): ServerSync<T> {
  const debounceMs = config.debounceMs ?? 2000;
  let store: SyncStore<T> | null = null;
  let suppressed = false;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const doPush = (): void => {
    if (!store) return;
    dirty = false;
    void Promise.resolve(config.push(store.get())).catch(() => {
      dirty = true; // retry on next successful save or hydrate
    });
  };

  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      doPush();
    }, debounceMs);
  };

  const save = (value: T): void => {
    writeStorageJson(config.key, value); // local-first, always
    if (isSyncActive() && !suppressed) {
      dirty = true;
      schedule();
    }
  };

  const attach = (s: SyncStore<T>): void => {
    store = s;
  };

  const hydrate = async (): Promise<void> => {
    if (!store || !isSyncActive()) return;
    const remote = await config.pull();
    if (remote == null) return; // backend unavailable → stay local
    suppressed = true;
    try {
      store.set(config.merge(store.get(), remote)); // writes localStorage; suppressed → no push
    } finally {
      suppressed = false;
    }
    await config.push(store.get()); // converge: server gets any local-newer records
    dirty = false;
  };

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (dirty && isSyncActive()) doPush();
  };

  const engine: ServerSync<T> = { save, attach, hydrate, flush };
  registerSync(engine);
  return engine;
}
