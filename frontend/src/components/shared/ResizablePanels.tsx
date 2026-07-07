import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useResizeSplit, type ResizeDirection } from '@/hooks/useResizeSplit';

export function ResizeHandle({
  direction,
  handleProps,
}: {
  direction: ResizeDirection;
  handleProps: ReturnType<typeof useResizeSplit>['handleProps'];
}) {
  const horizontal = direction === 'horizontal';
  return (
    <div
      {...handleProps}
      className={cn(
        'nodrag shrink-0 group',
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
  direction: ResizeDirection;
  splitPct: number;
  onSplitPctChange?: (pct: number) => void;
  minPct?: number;
  maxPct?: number;
  defaultPct?: number;
  first: ReactNode;
  second: ReactNode;
  className?: string;
  firstClassName?: string;
  /** When true, renders a static flex split without a drag handle. */
  disabled?: boolean;
  /** Fixed pixel width for the first pane (overrides percentage split). */
  firstWidthPx?: number;
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
  const { containerRef, splitPct, handleProps } = useResizeSplit({
    direction,
    splitPct: splitPctProp,
    onSplitPctChange,
    minPct,
    maxPct,
    defaultPct,
  });

  const horizontal = direction === 'horizontal';
  const firstSize = disabled ? splitPctProp : splitPct;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex min-h-0 min-w-0 overflow-hidden',
        horizontal ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden', firstClassName)}
        style={
          firstWidthPx != null
            ? horizontal
              ? { width: firstWidthPx }
              : { height: firstWidthPx }
            : horizontal
              ? { width: `${firstSize}%` }
              : { height: `${firstSize}%` }
        }
      >
        {first}
      </div>
      {!disabled && <ResizeHandle direction={direction} handleProps={handleProps} />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{second}</div>
    </div>
  );
}
