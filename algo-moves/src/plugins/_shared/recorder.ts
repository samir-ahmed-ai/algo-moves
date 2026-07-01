import type { Frame, Move } from '../../core/types';

export type EmitFn<S> = (type: string, note: string, caption: string, state: S, tone?: Move['tone']) => void;

/**
 * Factory for the common record() pattern: accumulate frames with typed state snapshots.
 *
 * @example
 * const { frames, emit } = createEmitter<BinState>(() => ({ values, lo, hi, ... }));
 * emit('INIT', 'lo=0', 'Start search.', null);
 */
export function createEmitter<S>(getState: () => S): { frames: Frame<S>[]; emit: EmitFn<S> } {
  const frames: Frame<S>[] = [];
  const emit: EmitFn<S> = (type, note, caption, _state, tone) =>
    frames.push({ move: { type, note, caption, tone }, state: getState() });
  return { frames, emit };
}
