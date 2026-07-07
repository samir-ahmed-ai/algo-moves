import { useState } from 'react';
import { Btn, Field } from '@/components/shared/formControls';

const DIRECTIONS = ['up', 'down', 'up-down', 'down-up'] as const;

export function ArpeggiatorBuilder({ onApply }: { onApply: (values: number[]) => void }) {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(8);
  const [dir, setDir] = useState<(typeof DIRECTIONS)[number]>('up');

  const generate = () => {
    const base = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    let values: number[];
    switch (dir) {
      case 'down':
        values = [...base].reverse();
        break;
      case 'up-down':
        values = [...base, ...[...base].slice(1, -1).reverse()];
        break;
      case 'down-up':
        values = [...[...base].reverse(), ...[...base].slice(1)];
        break;
      default:
        values = base;
    }
    onApply(values);
  };

  return (
    <div className="input-builder input-builder--arpeggiator nodrag flex flex-col gap-2">
      <Field label="Range">
        <div className="input-builder-range-row flex gap-2">
          <input
            type="number"
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
            className="input-builder-number w-16 rounded border border-edge bg-panel2 px-1"
          />
          <span>→</span>
          <input
            type="number"
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
            className="input-builder-number w-16 rounded border border-edge bg-panel2 px-1"
          />
        </div>
      </Field>
      <Field label="Direction">
        <select
          value={dir}
          onChange={(e) => setDir(e.target.value as typeof dir)}
          className="input-builder-select w-full rounded border border-edge bg-panel2 px-2 py-1"
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Btn variant="good" size="sm" onClick={generate}>
        Generate sequence
      </Btn>
    </div>
  );
}
