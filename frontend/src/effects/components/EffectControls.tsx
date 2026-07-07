import type { ComponentType } from 'react';
import { RangeEffectControls } from './RangeEffectControls';
import { MaskEffectControls } from './MaskEffectControls';
import { GenericEffectControls } from './GenericEffectControls';
import type { EffectControlsProps } from './effectControlsTypes';

export type { EffectControlsProps } from './effectControlsTypes';

/**
 * Registry mapping an effect id to its control panel. Effects not listed here fall
 * back to <GenericEffectControls>, which renders simple controls from the effect's
 * data shape. Add a bespoke control by adding one entry — no switch to edit.
 */
const EFFECT_CONTROLS: Record<string, ComponentType<EffectControlsProps>> = {
  fast: (p) => <RangeEffectControls {...p} label="Speed factor" operator="×" />,
  slow: (p) => <RangeEffectControls {...p} label="Hold factor" operator="÷" />,
  mask: MaskEffectControls,
};

export function EffectControls({
  effectId,
  data,
  onChange,
}: EffectControlsProps & { effectId: string }) {
  const Controls = EFFECT_CONTROLS[effectId];
  if (Controls) return <Controls data={data} onChange={onChange} />;
  return <GenericEffectControls effectId={effectId} data={data} onChange={onChange} />;
}
