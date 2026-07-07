import { useState, type ReactNode } from 'react';
import { Btn, Field } from '@/components/shared/formControls';

const DIRECTIONS = ['up', 'down', 'up-down', 'down-up'] as const;
type ArpeggiatorDirection = (typeof DIRECTIONS)[number];

function isDirection(value: unknown): value is ArpeggiatorDirection {
  return typeof value === 'string' && (DIRECTIONS as readonly string[]).includes(value);
}

function boundedInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
}

function sequenceRange(start: number, end: number): number[] {
  const first = boundedInt(start, 1);
  const last = boundedInt(end, first);
  const low = Math.min(first, last);
  const high = Math.max(first, last);
  return Array.from({ length: high - low + 1 }, (_, i) => low + i);
}

export function ArpeggiatorBuilder({
  onApply,
}: {
  readonly onApply: (values: number[]) => void;
}): ReactNode {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(8);
  const [dir, setDir] = useState<ArpeggiatorDirection>('up');

  const generate = () => {
    const base = sequenceRange(start, end);
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
            onChange={(e) => setStart(boundedInt(Number(e.target.value), start))}
            className="input-builder-number w-16 rounded border border-edge bg-panel2 px-1"
          />
          <span>→</span>
          <input
            type="number"
            value={end}
            onChange={(e) => setEnd(boundedInt(Number(e.target.value), end))}
            className="input-builder-number w-16 rounded border border-edge bg-panel2 px-1"
          />
        </div>
      </Field>
      <Field label="Direction">
        <select
          value={dir}
          onChange={(e) => setDir(isDirection(e.target.value) ? e.target.value : 'up')}
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
