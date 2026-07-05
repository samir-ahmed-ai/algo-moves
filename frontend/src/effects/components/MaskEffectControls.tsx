import { Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';
import type { EffectControlsProps } from './EffectControls';

const PRESETS = [
  { label: 'Always', value: 1 },
  { label: 'Often', value: 0.75 },
  { label: 'Sometimes', value: 0.5 },
  { label: 'Rarely', value: 0.25 },
];

export function MaskEffectControls({ data, onChange }: EffectControlsProps) {
  const probability = (data.probability as number) ?? 0.5;
  return (
    <div className="flex flex-col gap-2">
      <Field label="Keep probability">
        <span className={nodeText.sm}>{Math.round(probability * 100)}%</span>
      </Field>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ probability: p.value })}
            className="nodrag rounded border border-edge px-1.5 py-0.5 text-ink2 hover:bg-panel2"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
