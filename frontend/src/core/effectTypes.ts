import type { ComponentType } from 'react';
import type { Frame } from './types';

export type EffectCategory = 'time' | 'drill' | 'emphasis';

export interface EffectPlugin<D = unknown> {
  meta: { id: string; title: string; category: EffectCategory };
  defaultData: D;
  transformFrames: (frames: Frame[], data: D) => Frame[];
  traceSnippet: (data: D) => string;
  Panel: ComponentType<{ data: D; onChange: (p: Partial<D>) => void }>;
}

export type InputBuilderKind = 'pad' | 'beat' | 'arpeggiator' | 'polyrhythm' | 'custom';

export function defineEffect<D>(effect: EffectPlugin<D>): EffectPlugin<D> {
  return effect;
}
