import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Btn, Field } from '@/components/shared/formControls';
import { nodeText } from '@/design/typography';
import {
  createPadGrid,
  EUCLIDEAN_PRESETS,
  padGridToArray,
  toggleCell,
  type ColumnModifier,
  type PadGridState,
} from './padGrid';

const MODIFIERS: { id: ColumnModifier; label: string }[] = [
  { id: 'none', label: '—' },
  { id: 'repeat', label: '!2' },
  { id: 'slow', label: '/2' },
  { id: 'fast', label: '*2' },
  { id: 'euclid', label: 'E' },
];

export function PadGridBuilder({
  onApply,
  playheadCol,
}: {
  onApply: (values: number[]) => void;
  playheadCol?: number;
}) {
  const [grid, setGrid] = useState<PadGridState>(() => createPadGrid(4, 8));

  const onCell = (row: number, col: number, shift: boolean) => {
    setGrid((g) => toggleCell(g, row, col, shift));
  };

  const setColMod = (col: number, mod: ColumnModifier) => {
    setGrid((g) => ({ ...g, columnModifiers: { ...g.columnModifiers, [col]: mod } }));
  };

  const apply = useCallback(() => {
    onApply(padGridToArray(grid));
  }, [grid, onApply]);

  return (
    <div className="nodrag flex flex-col gap-2">
      <Field label="Pad grid — click cells; Shift+click to multi-select">
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5">
            {grid.cells.map((row, ri) => (
              <div key={ri} className="flex gap-0.5">
                {row.map((on, ci) => {
                  const key = `${ri},${ci}`;
                  const grouped = grid.selected.has(key);
                  const playhead = playheadCol === ci;
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={(e) => onCell(ri, ci, e.shiftKey)}
                      className={cn(
                        'h-6 w-6 rounded-sm border transition-colors',
                        nodeText['2xs'],
                        on ? 'border-accent bg-accent/30 text-ink' : 'border-edge bg-panel2 text-ink3',
                        grouped && 'ring-1 ring-accent',
                        playhead && 'ring-2 ring-good',
                      )}
                    >
                      {on ? ri + 1 : ''}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="mt-1 flex gap-0.5">
              {Array.from({ length: grid.cols }, (_, ci) => (
                <select
                  key={ci}
                  value={grid.columnModifiers[ci] ?? 'none'}
                  onChange={(e) => setColMod(ci, e.target.value as ColumnModifier)}
                  className={cn('h-5 w-6 rounded border border-edge bg-panel2', nodeText['2xs'])}
                  title={`Column ${ci + 1} modifier`}
                >
                  {MODIFIERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>
      </Field>
      <div className="flex flex-wrap gap-1">
        {EUCLIDEAN_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={cn('rounded border border-edge px-1.5 py-0.5 text-ink2 hover:bg-panel2', nodeText.xs)}
            onClick={() => setGrid(createPadGrid(p.steps, p.pulses))}
          >
            Euclid {p.label}
          </button>
        ))}
      </div>
      <Btn variant="good" size="sm" onClick={apply}>
        Apply pad → input
      </Btn>
    </div>
  );
}
