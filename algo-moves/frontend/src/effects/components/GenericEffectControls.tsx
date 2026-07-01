import { getEffect } from '../registry';
import { Field, nodeText } from '../../shell/canvas/nodeui';

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

  if (effectId === 'late') {
    const skip = (data.skip as number) ?? 1;
    return (
      <Field label="Skip first steps">
        <input
          type="number"
          min={0}
          max={20}
          value={skip}
          onChange={(e) => onChange({ skip: Number(e.target.value) })}
          className="nodrag w-full rounded border border-edge bg-panel2 px-2 py-1"
        />
      </Field>
    );
  }

  if (effectId === 'ply') {
    const times = (data.times as number) ?? 2;
    return (
      <Field label="Repeat each step">
        <span className={nodeText.sm}>×{times}</span>
        <input
          type="range"
          min={2}
          max={4}
          value={times}
          onChange={(e) => onChange({ times: Number(e.target.value) })}
          className="nodrag w-full"
        />
      </Field>
    );
  }

  if (effectId === 'reverse' || effectId === 'palindrome') {
    const enabled = (data.enabled as boolean) ?? true;
    return (
      <label className="nodrag flex cursor-pointer items-center gap-2 text-ink2">
        <input type="checkbox" checked={enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        <span className={nodeText.sm}>Enabled</span>
      </label>
    );
  }

  return null;
}
