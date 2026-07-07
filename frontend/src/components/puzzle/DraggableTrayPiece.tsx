import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface DraggableTrayPieceProps {
  id: string;
  className?: string;
  children: ReactNode;
}

export function DraggableTrayPiece({ id, className, children }: DraggableTrayPieceProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-grabbed={isDragging}
      className={cn('draggable-tray-piece', className, isDragging && 'tray-piece-dragging')}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
