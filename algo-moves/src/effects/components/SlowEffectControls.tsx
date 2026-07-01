import { Field, nodeText } from '../../shell/canvas/nodeui';

export function SlowEffectControls({
  data,
  onChange,
}: {
  data: { factor?: number };
  onChange: (p: Record<string, unknown>) => void;
}) {
  const factor = data.factor ?? 2;
  return (
    <Field label="Hold factor">
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
        <span className={nodeText.sm}>÷{factor}</span>
      </div>
    </Field>
  );
}
