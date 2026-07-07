import { Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';
import type { EffectControlsProps } from './effectControlsTypes';

const PRESETS = [
  { label: 'Always', value: 1 },
  { label: 'Often', value: 0.75 },
  { label: 'Sometimes', value: 0.5 },
  { label: 'Rarely', value: 0.25 },
] as const;

function probabilityValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0.5;
}

export function MaskEffectControls({ data, onChange }: EffectControlsProps): React.ReactNode {
  const probability = probabilityValue(data.probability);
  return (
    <div className="effect-controls effect-controls--mask flex flex-col gap-2">
      <Field label="Keep probability">
        <span className={`effect-value-pill ${nodeText.sm}`}>{Math.round(probability * 100)}%</span>
      </Field>
      <div className="effect-preset-row flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={probability === p.value}
            onClick={() => onChange({ probability: p.value })}
            className={`effect-preset nodrag rounded border px-1.5 py-0.5 ${
              probability === p.value
                ? 'border-accent bg-accentBg text-ink'
                : 'border-edge text-ink2 hover:bg-panel2'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
