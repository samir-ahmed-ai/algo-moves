import type { Frame } from './types';

export type EffectCategory = 'time' | 'drill' | 'emphasis';

export interface EffectPlugin<D = unknown> {
  meta: { id: string; title: string; category: EffectCategory };
  defaultData: D;
  transformFrames: (frames: Frame[], data: D) => Frame[];
  traceSnippet: (data: D) => string;
}

export type InputBuilderKind = 'pad' | 'beat' | 'arpeggiator' | 'polyrhythm' | 'custom';

function normalizeEffectMeta(meta: EffectPlugin['meta']): EffectPlugin['meta'] {
  return {
    ...meta,
    id: meta.id.trim(),
    title: meta.title.trim() || meta.id.trim(),
  };
}

export function defineEffect<D>(effect: EffectPlugin<D>): EffectPlugin<D> {
  return {
    ...effect,
    meta: normalizeEffectMeta(effect.meta),
  };
}
