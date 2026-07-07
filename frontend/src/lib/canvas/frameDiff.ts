import type { Frame, Player } from '@/core';

/** Placeholder frame when no algorithm replay is active (standalone freeform canvas). */
export const EMPTY_FRAME: Frame = {
  move: { type: 'init', note: '', caption: '' },
  state: {},
};

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

export function buildFrameContextValue(frames: Frame[], player: Player, frame: Frame | undefined) {
  const resolved = frame ?? frames[0] ?? EMPTY_FRAME;
  const prevState =
    player.index > 0
      ? (frames[player.index - 1]?.state as Record<string, unknown> | undefined)
      : undefined;
  const curState = resolved.state as Record<string, unknown> | undefined;
  return {
    frames,
    player,
    frame: resolved,
    changedKeys: diffFrameStates(prevState, curState),
  };
}
