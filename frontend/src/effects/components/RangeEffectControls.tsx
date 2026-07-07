import { Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';
import type { EffectControlsProps } from './effectControlsTypes';

/** Integer-factor slider shared by the fast (×) and slow (÷) effects. */
export function RangeEffectControls({
  data,
  onChange,
  label,
  operator,
}: EffectControlsProps & { label: string; operator: string }) {
  const factor = (data.factor as number) ?? 2;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={2}
          max={4}
          step={1}
          value={factor}
          onChange={(e) => onChange({ factor: Number(e.target.value) })}
          className="nodrag flex-1"
        />
        <span className={nodeText.sm}>
          {operator}
          {factor}
        </span>
      </div>
    </Field>
  );
}
