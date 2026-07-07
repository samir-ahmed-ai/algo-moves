import { useState, type ReactNode } from 'react';
import { Btn, Field } from '@/components/shared/formControls';
import { GridToggleButton } from '../components/GridToggleButton';

function cloneLayers(layers: readonly (readonly number[])[]): number[][] {
  return layers.map((layer) => [...layer]);
}

export function PolyrhythmBuilder({
  onApply,
}: {
  readonly onApply: (layers: number[][]) => void;
}): ReactNode {
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
              <GridToggleButton
                key={si}
                active={!!v}
                label={`Layer ${li + 1} step ${si + 1}`}
                onClick={() => toggle(li, si)}
              />
            ))}
          </div>
        ))}
      </Field>
      <Btn variant="good" size="sm" onClick={() => onApply(cloneLayers(layers))}>
        Apply layers
      </Btn>
    </div>
  );
}
