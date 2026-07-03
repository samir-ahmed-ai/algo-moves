import type { ReactNode } from 'react';
import { ArrayRow, type ArrayPointer } from '../../../components/board/ArrayRow';
import { VizStage } from '../vizKit';

export interface ArrayPatternViewProps {
  values: number[] | string[];
  pointers?: ArrayPointer[];
  windowRange?: [number, number] | null;
  cellTone?: (i: number) => string;
  rail?: ReactNode;
}

/** Standard ArrayRow + VizStage wrapper for array / sliding-window simulators. */
export function ArrayPatternView({
  values,
  pointers = [],
  windowRange = null,
  cellTone,
  rail,
}: ArrayPatternViewProps) {
  return (
    <VizStage rail={rail}>
      <ArrayRow values={values} pointers={pointers} windowRange={windowRange} cellTone={cellTone} />
    </VizStage>
  );
}

export { type ArrayPointer } from '../../../components/board/ArrayRow';
