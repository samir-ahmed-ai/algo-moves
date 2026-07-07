import { getEffect } from '../registry';
import { Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';

function fieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function GenericEffectControls({
  effectId,
  data,
  onChange,
}: {
  effectId: string;
  data: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const effect = getEffect(effectId);
  if (!effect) return null;

  const defaults = (effect.defaultData ?? {}) as Record<string, unknown>;
  const keys = Object.keys(defaults);
  if (keys.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {keys.map((key) => {
        const sample = defaults[key];
        const value = (data[key] ?? sample) as unknown;

        if (typeof sample === 'boolean') {
          return (
            <label key={key} className="nodrag flex cursor-pointer items-center gap-2 text-ink2">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange({ [key]: e.target.checked })}
              />
              <span className={nodeText.sm}>{fieldLabel(key)}</span>
            </label>
          );
        }

        if (typeof sample === 'number') {
          const n = Number(value);
          const min = key === 'skip' ? 0 : key === 'times' ? 2 : 0;
          const max = key === 'skip' ? 20 : key === 'times' ? 4 : 100;
          const useRange = key === 'times';
          return (
            <Field key={key} label={fieldLabel(key)}>
              {useRange ? (
                <>
                  <span className={nodeText.sm}>×{n}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={n}
                    onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                    className="nodrag w-full"
                  />
                </>
              ) : (
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={n}
                  onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                  className="nodrag w-full rounded border border-edge bg-panel2 px-2 py-1"
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
