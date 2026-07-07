import type { RoomMode } from '../data/types';
import { stripNestedGameState } from '../net/nestedRoomState';

export interface RoomState {
  game?: string | null;
  mode?: RoomMode;
  locale?: string;
  started?: boolean;
}

/** Merge room metadata patches; clears nested game snapshots when game/started changes. */
export function patchRoomState(sharedState: unknown, patch: Partial<RoomState>) {
  const shouldClearNested = 'game' in patch || 'started' in patch;
  const base = shouldClearNested
    ? stripNestedGameState(sharedState)
    : { ...(sharedState as object | null) };
  return { ...base, ...patch };
}
