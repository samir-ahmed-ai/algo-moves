/**
 * Nested room shared-state contract
 * =================================
 *
 * The arcade game server stores one JSON blob per room (`sharedState`). Room
 * metadata lives at the top level; each host-authoritative game nests its
 * snapshot under a short key so multiple games never clobber each other.
 *
 * Top-level keys (owned by the room shell, not games):
 *   - `game`    — active {@link GameId} from the catalog
 *   - `started` — whether a match is in progress
 *   - `locale`  — host-selected UI locale (`ar` | `en`)
 *
 * Nested game keys ({@link NESTED_GAME_STATE_KEYS}):
 *   - `ttt`   — tic-tac-toe board + generation counter
 *   - `meld`  — mind-meld round/phase snapshot
 *   - `wyr`   — would-you-rather {@link WyrState}
 *   - `nduel` — number-duel shared phase snapshot
 *
 * Games that relay moves over {@link useGameChannel} (rock-paper-scissors,
 * reaction-duel) do not use nested keys — only P2P channel frames.
 *
 * Host contract:
 *   1. Publish with {@link mergeNestedRoomState} so room metadata survives.
 *   2. On game switch or rematch, call {@link stripNestedGameState} first.
 *   3. Keep {@link useSharedStateRef} current so publish closures see live state.
 *
 * Guest/spectator contract:
 *   - Adopt inbound snapshots via {@link useAdoptNestedState}; hosts skip adoption.
 *   - Guard renders with a type predicate passed to {@link readNestedRoomState}.
 *
 * Equality:
 *   {@link nestedSnapshotEqual} uses JSON stringify — fine for small snapshots;
 *   do not use for large or order-sensitive structures.
 */
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

/** Keys used by host-authoritative games under room shared state. */
export const NESTED_GAME_STATE_KEYS = ['ttt', 'meld', 'wyr', 'nduel'] as const;

export type NestedGameStateKey = (typeof NESTED_GAME_STATE_KEYS)[number];
type SharedStateRecord = Record<string, unknown>;

/** Map nested snapshot keys to canonical {@link GameId} values. */
export const NESTED_KEY_TO_GAME_ID = {
  ttt: 'tic-tac-toe',
  meld: 'mind-meld',
  wyr: 'would-you-rather',
  nduel: 'number-duel',
} as const satisfies Record<NestedGameStateKey, string>;

function cloneSharedState(sharedState: unknown): SharedStateRecord {
  return sharedState && typeof sharedState === 'object' && !Array.isArray(sharedState)
    ? { ...(sharedState as SharedStateRecord) }
    : {};
}

/** Read game state nested under a key in room shared state. */
export function readNestedRoomState<T extends object>(
  sharedState: unknown,
  key: string,
  isState: (v: unknown) => v is T,
): T | null {
  if (!sharedState || typeof sharedState !== 'object') return null;
  const nested = (sharedState as SharedStateRecord)[key];
  return isState(nested) ? nested : null;
}

/** Publish game state under a key without clobbering room metadata (game, started, locale). */
export function mergeNestedRoomState<T>(
  sharedState: unknown,
  key: string,
  nested: T,
): SharedStateRecord {
  return { ...cloneSharedState(sharedState), [key]: nested };
}

/** Drop stale nested game snapshots when switching games or restarting a match. */
export function stripNestedGameState(sharedState: unknown): SharedStateRecord {
  const base = cloneSharedState(sharedState);
  for (const key of NESTED_GAME_STATE_KEYS) {
    delete base[key];
  }
  return base;
}

/** Cheap equality for small nested snapshots (avoids pointless re-renders). */
export function nestedSnapshotEqual<T>(a: T, b: T): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return Object.is(a, b);
  }
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
