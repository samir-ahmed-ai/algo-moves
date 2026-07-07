import { useState } from 'react';
import { Btn, Field } from '@/components/shared/formControls';
import { GridToggleButton } from '../components/GridToggleButton';

export function PolyrhythmBuilder({ onApply }: { onApply: (layers: number[][]) => void }) {
  const [layers, setLayers] = useState<number[][]>([
    [1, 0, 1, 0],
    [1, 1, 0, 0],
    [1, 0, 0, 1],
  ]);

  const toggle = (li: number, si: number) => {
    setLayers((ls) =>
      ls.map((l, i) => (i === li ? l.map((v, j) => (j === si ? (v ? 0 : 1) : v)) : l)),
    );
  };

  return (
    <div className="input-builder input-builder--polyrhythm nodrag flex flex-col gap-2">
      <Field label="3-layer constraints">
        {layers.map((layer, li) => (
          <div key={li} className="input-builder-layer-row mb-1 flex gap-1">
            <span className="input-builder-layer-label w-6 text-xs text-ink3">L{li + 1}</span>
            {layer.map((v, si) => (
              <GridToggleButton key={si} active={!!v} onClick={() => toggle(li, si)} />
            ))}
          </div>
        ))}
      </Field>
      <Btn variant="good" size="sm" onClick={() => onApply(layers)}>
        Apply layers
      </Btn>
    </div>
  );
}
