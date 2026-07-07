import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

/** Keys used by host-authoritative games under room shared state. */
export const NESTED_GAME_STATE_KEYS = ['ttt', 'meld', 'wyr', 'nduel'] as const;

/** Read game state nested under a key in room shared state. */
export function readNestedRoomState<T extends object>(
  sharedState: unknown,
  key: string,
  isState: (v: unknown) => v is T,
): T | null {
  if (!sharedState || typeof sharedState !== 'object') return null;
  const nested = (sharedState as Record<string, unknown>)[key];
  return isState(nested) ? nested : null;
}

/** Publish game state under a key without clobbering room metadata (game, started, locale). */
export function mergeNestedRoomState<T>(sharedState: unknown, key: string, nested: T): object {
  const base = sharedState && typeof sharedState === 'object' ? { ...(sharedState as object) } : {};
  return { ...base, [key]: nested };
}

/** Drop stale nested game snapshots when switching games or restarting a match. */
export function stripNestedGameState(sharedState: unknown): object {
  const base = sharedState && typeof sharedState === 'object' ? { ...(sharedState as object) } : {};
  for (const key of NESTED_GAME_STATE_KEYS) {
    delete (base as Record<string, unknown>)[key];
  }
  return base;
}

/** Cheap equality for small nested snapshots (avoids pointless re-renders). */
export function nestedSnapshotEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Keep publish closures from closing over a stale sharedState snapshot. */
export function useSharedStateRef(sharedState: unknown) {
  const ref = useRef(sharedState);
  ref.current = sharedState;
  return ref;
}

/**
 * Guests and spectators adopt inbound nested snapshots.
 * The host skips adoption — it owns local state and publishes outward.
 */
export function useAdoptNestedState<T extends object>(
  sharedState: unknown,
  key: string,
  isState: (v: unknown) => v is T,
  setState: Dispatch<SetStateAction<T>>,
  isHost: boolean,
): void {
  useEffect(() => {
    if (isHost) return;
    const remote = readNestedRoomState(sharedState, key, isState);
    if (!remote) return;
    setState((prev) => (nestedSnapshotEqual(prev, remote) ? prev : remote));
  }, [sharedState, key, isHost, setState, isState]);
}
