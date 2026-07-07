import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface WritableRef<T> {
  current: T | null;
}

interface AssembledDropZoneProps {
  id?: string;
  active?: boolean;
  className?: string;
  innerRef?: WritableRef<HTMLDivElement>;
  children: ReactNode;
}

export function AssembledDropZone({
  id = 'assembled-drop',
  active,
  className,
  innerRef,
  children,
}: AssembledDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (innerRef) innerRef.current = node;
      }}
      role="region"
      aria-label="Assembled code"
      aria-dropeffect="move"
      className={cn('assembled-drop-zone', className, (active || isOver) && 'assembled-drag-over')}
    >
      {children}
    </div>
  );
}
