import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function DraggableTrayPiece({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(className, isDragging && 'tray-piece-dragging')} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
