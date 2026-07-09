/**
 * Module-level sync session state, shared between the (module-singleton) sync
 * engines and the React `useLearningSync` hook that drives them. Kept outside React
 * so a store's synchronous `save` can cheaply ask "is sync active right now?" without
 * reaching into context.
 */

export interface SyncEngineHandle {
  /** Guest → account: merge local into the account and converge-push. */
  hydrate: () => Promise<void>;
  /** Account load / switch: replace local with the server value. */
  hydrateReplace: () => Promise<void>;
  /** Sign-out: clear the store to empty. */
  reset: () => void;
  /** Drain any pending debounced push immediately (tab close / visibility change). */
  flush: () => void;
}

let active = false;
const engines = new Set<SyncEngineHandle>();

/** True only when a signed-in, non-anonymous user has a reachable backend. */
export function isSyncActive(): boolean {
  return active;
}

export function setSyncActive(next: boolean): void {
  active = next;
}

export function registerSync(engine: SyncEngineHandle): void {
  engines.add(engine);
}

export function allSyncs(): SyncEngineHandle[] {
  return [...engines];
}
