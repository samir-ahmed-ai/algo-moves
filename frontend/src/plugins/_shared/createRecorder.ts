import type { Frame, Tone, Move } from '../../core/types';

export interface Recorder<S> {
  /** Append a move frame; partial state merges over the recorder baseline. */
  emit: (type: string, note: string, caption: string, partial?: Partial<S>, tone?: Tone) => void;
  /** Collected frames (same array returned by `frames`). */
  frames: Frame<S>[];
  /** Latest merged state snapshot after the last emit. */
  getState: () => S;
  /** Replace the working state used as the baseline for the next emit. */
  setState: (next: S) => void;
}

/**
 * Standard frame recorder used by simulators. Each emit merges `partial` into
 * a baseline state snapshot (defaults + optional per-recorder overrides).
 */
export function createRecorder<S>(
  makeBaseState: () => S,
  options?: { merge?: (base: S, partial: Partial<S>) => S },
): Recorder<S> {
  const frames: Frame<S>[] = [];
  let base = makeBaseState();
  const merge = options?.merge ?? ((b, p) => ({ ...b, ...p }));

  const emit = (
    type: string,
    note: string,
    caption: string,
    partial: Partial<S> = {},
    tone?: Tone,
  ) => {
    base = merge(makeBaseState(), partial);
    const move: Move = { type, note, caption };
    if (tone !== undefined) move.tone = tone;
    frames.push({ move, state: base });
  };

  return {
    emit,
    frames,
    getState: () => base,
    setState: (next) => {
      base = next;
    },
  };
}
