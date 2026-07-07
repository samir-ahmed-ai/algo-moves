import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  useResizeSplit,
  type ResizeDirection,
  type UseResizeSplitOptions,
} from '@/hooks/useResizeSplit';

export function ResizeHandle({
  direction,
  handleProps,
}: {
  readonly direction: ResizeDirection;
  readonly handleProps: ReturnType<typeof useResizeSplit>['handleProps'];
}) {
  const horizontal = direction === 'horizontal';
  return (
    <div
      {...handleProps}
      className={cn(
        'resize-handle nodrag shrink-0 group',
        horizontal ? 'resize-handle--horizontal' : 'resize-handle--vertical',
        horizontal
          ? 'flex w-2 cursor-col-resize items-stretch justify-center px-0.5'
          : 'flex h-2 cursor-row-resize items-center justify-center py-0.5',
      )}
    >
      <div
        className={cn(
          'split-handle bg-edge transition-colors hover:bg-accent',
          horizontal ? 'h-full w-px' : 'h-px w-full',
        )}
      />
    </div>
  );
}

export interface ResizablePanelsProps {
  readonly direction: ResizeDirection;
  readonly splitPct: number;
  readonly onSplitPctChange?: (pct: number) => void;
  readonly minPct?: number;
  readonly maxPct?: number;
  readonly defaultPct?: number;
  readonly first: ReactNode;
  readonly second: ReactNode;
  readonly className?: string;
  readonly firstClassName?: string;
  /** When true, renders a static flex split without a drag handle. */
  readonly disabled?: boolean;
  /** Fixed pixel width for the first pane (overrides percentage split). */
  readonly firstWidthPx?: number;
}

export function ResizablePanels({
  direction,
  splitPct: splitPctProp,
  onSplitPctChange,
  minPct,
  maxPct,
  defaultPct,
  first,
  second,
  className,
  firstClassName,
  disabled,
  firstWidthPx,
}: ResizablePanelsProps) {
  const resizeSplitOptions: UseResizeSplitOptions = {
    direction,
    splitPct: splitPctProp,
    ...(onSplitPctChange !== undefined ? { onSplitPctChange } : {}),
    ...(minPct !== undefined ? { minPct } : {}),
    ...(maxPct !== undefined ? { maxPct } : {}),
    ...(defaultPct !== undefined ? { defaultPct } : {}),
  };
  const { containerRef, splitPct, handleProps } = useResizeSplit(resizeSplitOptions);

  const horizontal = direction === 'horizontal';
  const firstSize = disabled ? splitPctProp : splitPct;
  const fixedFirstSize =
    typeof firstWidthPx === 'number' && Number.isFinite(firstWidthPx)
      ? Math.max(0, firstWidthPx)
      : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'resizable-panels flex min-h-0 min-w-0 overflow-hidden',
        horizontal ? 'flex-row' : 'flex-col',
        horizontal ? 'resizable-panels--horizontal' : 'resizable-panels--vertical',
        disabled && 'resizable-panels--disabled',
        className,
      )}
    >
      <div
        className={cn(
          'resizable-panel resizable-panel--first flex min-h-0 min-w-0 flex-col overflow-hidden',
          firstClassName,
        )}
        style={
          fixedFirstSize != null
            ? horizontal
              ? { width: fixedFirstSize }
              : { height: fixedFirstSize }
            : horizontal
              ? { width: `${firstSize}%` }
              : { height: `${firstSize}%` }
        }
      >
        {first}
      </div>
      {!disabled && <ResizeHandle direction={direction} handleProps={handleProps} />}
      <div className="resizable-panel resizable-panel--second flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {second}
      </div>
    </div>
  );
}
