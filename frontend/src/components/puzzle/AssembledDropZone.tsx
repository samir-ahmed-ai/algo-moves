import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function AssembledDropZone({
  id = 'assembled-drop',
  active,
  className,
  innerRef,
  children,
}: {
  id?: string;
  active?: boolean;
  className?: string;
  innerRef?: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (innerRef) innerRef.current = node;
      }}
      role="region"
      aria-label="Assembled code"
      className={cn(className, (active || isOver) && 'assembled-drag-over')}
    >
      {children}
    </div>
  );
}
