import type { Frame, Player } from '@/core';

/** Placeholder frame when no algorithm replay is active (standalone freeform canvas). */
export const EMPTY_FRAME: Frame = Object.freeze({
  move: { type: 'init', note: '', caption: '' },
  state: {},
}) as Frame;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

/** Keys whose JSON-serialized values differ between consecutive frame states. */
export function diffFrameStates(
  prev: Record<string, unknown> | null | undefined,
  cur: Record<string, unknown> | null | undefined,
): string[] {
  if (!prev || !cur) return [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
  const changed: string[] = [];
  for (const k of keys) {
    const prevValue = prev[k];
    const curValue = cur[k];
    if (Object.is(prevValue, curValue)) continue;
    const prevJson = safeJson(prevValue);
    const curJson = safeJson(curValue);
    if (prevJson === undefined || curJson === undefined || prevJson !== curJson) changed.push(k);
  }
  return changed;
}

function clampFrameIndex(index: number, frames: readonly Frame[]): number {
  if (frames.length === 0) return 0;
  return Number.isFinite(index) ? Math.max(0, Math.min(Math.round(index), frames.length - 1)) : 0;
}

export function buildFrameContextValue(
  frames: readonly Frame[],
  player: Player,
  frame: Frame | undefined,
) {
  const index = clampFrameIndex(player.index, frames);
  const resolved = frame ?? frames[index] ?? frames[0] ?? EMPTY_FRAME;
  const prevFrame = index > 0 ? frames[index - 1] : undefined;
  const prevState = prevFrame && isRecord(prevFrame.state) ? prevFrame.state : undefined;
  const curState = isRecord(resolved.state) ? resolved.state : undefined;
  return {
    frames,
    player,
    frame: resolved,
    changedKeys: diffFrameStates(prevState, curState),
  };
}
