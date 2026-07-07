import type { DragEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { nodeIcon } from '@/shell/panels';
import { chromeText } from '../../chromeUi';
import { RADIUS_SHELL } from './nodeui';

function TrayItem({
  kind,
  title,
  dndKey,
  onAddKind,
}: {
  kind: string;
  title: string;
  dndKey: string;
  onAddKind: (kind: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={() => onAddKind(kind)}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData(dndKey, kind);
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={`Add ${title}`}
      aria-label={`Add ${title}`}
      className={cn(
        'flex w-full cursor-grab items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink active:cursor-grabbing',
        chromeText.sm,
      )}
    >
      <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">{nodeIcon(kind)}</span>
      {title}
    </button>
  );
}

/** Persistent top-left tray for dragging interview panels onto the canvas. */
export function InterviewPanelTray() {
  const { canvasAdd, canvasVariant, mode, present } = useWorkspace();

  if (
    present ||
    canvasVariant !== 'interview' ||
    mode !== 'visualize' ||
    !canvasAdd ||
    canvasAdd.addableKinds.length === 0
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        'nodrag absolute left-3 top-3 z-10 w-44 border border-edge bg-panel/95 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur',
        RADIUS_SHELL,
      )}
    >
      <p className={cn('px-2 py-1 text-ink3', chromeText.xs)}>Interview panels</p>
      <div className="flex flex-col gap-0.5">
        {canvasAdd.addableKinds.map((k) => (
          <TrayItem
            key={k.id}
            kind={k.id}
            title={k.title}
            dndKey={canvasAdd.dndKey}
            onAddKind={canvasAdd.onAddKind}
          />
        ))}
      </div>
    </div>
  );
}
