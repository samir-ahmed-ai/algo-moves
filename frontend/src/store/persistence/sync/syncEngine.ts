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
 *  - `hydrate` (guest → account) pulls, MERGES with local, and converge-pushes — the
 *    anonymous→auth migration that carries a guest's local work up into their account.
 *  - `hydrateReplace` (account load / account switch) pulls and REPLACES local with the
 *    server value, discarding whatever the previous session left in the singleton store.
 *  - `reset` clears the store to empty (on sign-out) so the next user never inherits
 *    the previous account's data from the shared localStorage.
 *
 * The suppress flag + once-per-userId hydrate + single explicit converge push are
 * what prevent a pull→save→push loop.
 */
export interface ServerSyncConfig<T> {
  key: string;
  /** The empty/cleared value for this store (used by reset and replace fallback). */
  empty: T;
  /** Server truth as the store's value, or null when the backend is unavailable. */
  pull: () => Promise<T | null>;
  /** Push the store's value; `keepalive` survives page unload. Return value ignored. */
  push: (value: T, opts?: { keepalive?: boolean }) => Promise<unknown>;
  /** Pure merge of local and remote — must match the server's ON CONFLICT merge. */
  merge: (local: T, remote: T) => T;
  debounceMs?: number;
}

export interface ServerSync<T> {
  /** Pass as the third arg to createSyncStore. */
  save: (value: T) => void;
  /** Wire the created store back in (needed for push/applyRemote). */
  attach: (store: SyncStore<T>) => void;
  /** Guest → account: merge local into the account and converge-push. */
  hydrate: () => Promise<void>;
  /** Account load / switch: replace local with the server value (no merge, no push). */
  hydrateReplace: () => Promise<void>;
  /** Sign-out: clear the store to empty so the next user starts clean. */
  reset: () => void;
  flush: () => void;
}

export function createServerSync<T>(config: ServerSyncConfig<T>): ServerSync<T> {
  const debounceMs = config.debounceMs ?? 2000;
  let store: SyncStore<T> | null = null;
  let suppressed = false;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const doPush = (keepalive = false): void => {
    if (!store) return;
    dirty = false;
    void Promise.resolve(config.push(store.get(), { keepalive })).catch(() => {
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

  /** Apply a value from the server without triggering a push. */
  const applyRemote = (value: T): void => {
    if (!store) return;
    suppressed = true;
    try {
      store.set(value);
    } finally {
      suppressed = false;
    }
  };

  const hydrate = async (): Promise<void> => {
    if (!store || !isSyncActive()) return;
    const remote = await config.pull();
    if (remote == null) return; // backend unavailable → stay local
    applyRemote(config.merge(store.get(), remote)); // suppressed → no push
    await config.push(store.get()); // converge: server gets any local-newer records
    dirty = false;
  };

  const hydrateReplace = async (): Promise<void> => {
    if (!store || !isSyncActive()) return;
    const remote = await config.pull();
    // On an account switch we must NOT keep the previous account's local data; if the
    // pull fails, clear to empty rather than leak the prior user's data into this one.
    applyRemote(remote ?? config.empty);
    dirty = false;
  };

  const reset = (): void => {
    applyRemote(config.empty);
    dirty = false;
  };

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (dirty && isSyncActive()) doPush(true); // keepalive so the write survives unload
  };

  const engine: ServerSync<T> = { save, attach, hydrate, hydrateReplace, reset, flush };
  registerSync(engine);
  return engine;
}
