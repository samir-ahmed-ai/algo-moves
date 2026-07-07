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
