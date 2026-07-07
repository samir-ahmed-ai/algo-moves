import type { ComponentType } from 'react';
import { RangeEffectControls } from './RangeEffectControls';
import { MaskEffectControls } from './MaskEffectControls';
import { GenericEffectControls } from './GenericEffectControls';
import type { EffectControlsProps } from './effectControlsTypes';

export type { EffectControlsProps } from './effectControlsTypes';

interface EffectControlsRootProps extends EffectControlsProps {
  readonly effectId: string;
}

/**
 * Registry mapping an effect id to its control panel. Effects not listed here fall
 * back to <GenericEffectControls>, which renders simple controls from the effect's
 * data shape. Add a bespoke control by adding one entry — no switch to edit.
 */
const EFFECT_CONTROLS: Readonly<Record<string, ComponentType<EffectControlsProps>>> = {
  fast: (p) => <RangeEffectControls {...p} label="Speed factor" operator="×" />,
  slow: (p) => <RangeEffectControls {...p} label="Hold factor" operator="÷" />,
  mask: MaskEffectControls,
};

function normalizeEffectId(effectId: string): string {
  return effectId.trim().toLowerCase();
}

export function EffectControls({
  effectId,
  data,
  onChange,
}: EffectControlsRootProps): React.ReactNode {
  const normalizedEffectId = normalizeEffectId(effectId);
  const Controls = EFFECT_CONTROLS[normalizedEffectId];
  if (Controls) return <Controls data={data} onChange={onChange} />;
  return <GenericEffectControls effectId={normalizedEffectId} data={data} onChange={onChange} />;
}
