import { createRecorder } from '../../_shared/createRecorder';
import type { Frame, Tone } from '../../../core/types';

/** Partial that allows explicit `undefined` (exactOptionalPropertyTypes). */
export type LoosePartial<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export interface PrepRecorder<S> {
  emit: (
    type: string,
    note: string,
    caption: string,
    partial?: LoosePartial<S>,
    tone?: Tone,
  ) => void;
  frames: Frame<S>[];
  getState: () => S;
  setState: (next: S) => void;
}

/** Merge only defined partial fields onto a base state. */
export function mergeState<S extends object>(base: S, partial: LoosePartial<S>): S {
  const out = { ...base };
  for (const key of Object.keys(partial) as (keyof S)[]) {
    const value = partial[key];
    if (value !== undefined) out[key] = value as S[keyof S];
  }
  return out;
}

export function at<T>(arr: readonly T[], index: number): T {
  return arr[index]!;
}

/** Build a rail stack item without passing `tone: undefined`. */
export function railItem(
  label: string,
  tone?: 'good' | 'bad' | 'accent' | 'warn',
): { label: string; tone?: 'good' | 'bad' | 'accent' | 'warn' } {
  return tone === undefined ? { label } : { label, tone };
}

export function createPrepRecorder<S>(
  makeBaseState: () => S,
  options?: { merge?: (base: S, partial: LoosePartial<S>) => S },
): PrepRecorder<S> {
  const recorder = options?.merge
    ? createRecorder<S>(makeBaseState, {
        merge: (base, partial) => options.merge!(base, partial as LoosePartial<S>),
      })
    : createRecorder<S>(makeBaseState);

  const emit = (
    type: string,
    note: string,
    caption: string,
    partial: LoosePartial<S> = {},
    tone?: Tone,
  ) => recorder.emit(type, note, caption, partial as Partial<S>, tone);

  return { ...recorder, emit };
}
