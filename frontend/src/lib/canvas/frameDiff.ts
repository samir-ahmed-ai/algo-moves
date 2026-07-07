import type { Frame, Player } from '@/core';

/** Keys whose JSON-serialized values differ between consecutive frame states. */
export function diffFrameStates(
  prev: Record<string, unknown> | null | undefined,
  cur: Record<string, unknown> | null | undefined,
): string[] {
  if (!prev || !cur) return [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(cur[k])) changed.push(k);
  }
  return changed;
}

export function buildFrameContextValue(frames: Frame[], player: Player, frame: Frame) {
  const prevState =
    player.index > 0 ? (frames[player.index - 1]?.state as Record<string, unknown> | undefined) : undefined;
  const curState = frame.state as Record<string, unknown> | undefined;
  return {
    frames,
    player,
    frame,
    changedKeys: diffFrameStates(prevState, curState),
  };
}
