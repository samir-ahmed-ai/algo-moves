import { getEffect } from '../registry';
import { Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';
import type { EffectControlsProps } from './effectControlsTypes';

function fieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finiteNumber(value, fallback)));
}

interface GenericEffectControlsProps extends EffectControlsProps {
  readonly effectId: string;
}

export function GenericEffectControls({
  effectId,
  data,
  onChange,
}: GenericEffectControlsProps): React.ReactNode {
  const effect = getEffect(effectId);
  if (!effect) return null;

  const defaults = (effect.defaultData ?? {}) as Record<string, unknown>;
  const keys = Object.keys(defaults);
  if (keys.length === 0) return null;

  return (
    <div className="effect-controls effect-controls--generic flex flex-col gap-2">
      {keys.map((key) => {
        const sample = defaults[key];
        const value = (data[key] ?? sample) as unknown;

        if (typeof sample === 'boolean') {
          const checked = typeof value === 'boolean' ? value : sample;
          return (
            <label
              key={key}
              className="effect-toggle-row nodrag flex cursor-pointer items-center gap-2 text-ink2"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange({ [key]: e.target.checked })}
              />
              <span className={nodeText.sm}>{fieldLabel(key)}</span>
            </label>
          );
        }

        if (typeof sample === 'number') {
          const min = key === 'skip' ? 0 : key === 'times' ? 2 : 0;
          const max = key === 'skip' ? 20 : key === 'times' ? 4 : 100;
          const n = clampNumber(value, sample, min, max);
          const useRange = key === 'times';
          return (
            <Field key={key} label={fieldLabel(key)}>
              {useRange ? (
                <>
                  <span className={`effect-value-pill ${nodeText.sm}`}>×{n}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={n}
                    onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                    className="effect-range nodrag w-full"
                  />
                </>
              ) : (
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={n}
                  onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                  className="effect-number nodrag w-full rounded border border-edge bg-panel2 px-2 py-1"
                />
              )}
            </Field>
          );
        }

        return null;
      })}
    </div>
  );
}
