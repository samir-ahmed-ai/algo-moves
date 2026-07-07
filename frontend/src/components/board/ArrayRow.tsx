import { useId, type ReactNode } from 'react';
import { flipKeys } from './flipKeys';

export interface ArrayPointer {
  /** Index the pointer sits under/over. -1 hides it (e.g. lo > hi). */
  i: number;
  label: string;
  /** Colour key → `.ptr-<tone>` (accent | good | bad | warn). */
  tone?: 'accent' | 'good' | 'bad' | 'warn';
  /** 'above' floats over the cells, 'below' under them. Default 'below'. */
  place?: 'above' | 'below';
}

export interface ArrayRowProps {
  values: (number | string)[];
  /** Per-cell class suffix → `.arow-cell.<tone>`. */
  cellTone?: (i: number) => string;
  pointers?: ArrayPointer[];
  /** Inclusive [start,end] range tinted as the active window. */
  windowRange?: [number, number] | null;
  label?: (i: number) => ReactNode;
}

function Marker({ p }: { p: ArrayPointer }) {
  return (
    <span
      className={`arow-ptr ptr-${p.tone ?? 'accent'} ${p.place === 'above' ? 'above' : 'below'}`}
    >
      {p.place === 'above' ? '▼' : '▲'} {p.label}
    </span>
  );
}

/**
 * A single array laid out as fixed columns so pointer pills line up exactly
 * under their index — for binary search, two-pointers and sliding windows.
 */
export function ArrayRow({ values, cellTone, pointers = [], windowRange, label }: ArrayRowProps) {
  const fid = useId();
  const n = values.length;
  const above = pointers.filter((p) => p.place === 'above' && p.i >= 0);
  const below = pointers.filter((p) => p.place !== 'above' && p.i >= 0);
  const cols = `repeat(${n}, minmax(34px, 1fr))`;
  const marksFor = (list: ArrayPointer[], i: number) => list.filter((p) => p.i === i);
  const keys = flipKeys(values, fid);

  return (
    <div className="arow" style={{ gridTemplateColumns: cols }}>
      {values.map((_, i) => (
        <div key={`a${i}`} className="arow-slot above">
          {marksFor(above, i).map((p, k) => (
            <Marker key={k} p={p} />
          ))}
        </div>
      ))}
      {values.map((v, i) => {
        const inWin = windowRange && i >= windowRange[0] && i <= windowRange[1];
        return (
          <div
            key={`c${i}`}
            data-flip={keys[i]}
            className={`arow-cell ${cellTone?.(i) ?? ''} ${inWin ? 'in-window' : ''}`}
          >
            <span className="arow-val">{v}</span>
            <span className="arow-idx">{label ? label(i) : i}</span>
          </div>
        );
      })}
      {values.map((_, i) => (
        <div key={`b${i}`} className="arow-slot below">
          {marksFor(below, i).map((p, k) => (
            <Marker key={k} p={p} />
          ))}
        </div>
      ))}
    </div>
  );
}
