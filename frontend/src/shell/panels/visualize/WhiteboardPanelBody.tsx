import { useMemo } from 'react';
import { ExcalidrawWrapper } from '@/components/shared/ExcalidrawWrapper';
import { useSubDocSync } from '@/shell/canvas/collab/sync/useSubDocSync';
import type { WhiteboardPayload } from '@/shell/canvas/collab/protocol/subdocProtocol';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';

export function WhiteboardPanelBody() {
  const sync = useSubDocSync('whiteboard');
  const payload = sync.payload as WhiteboardPayload;

  const collaborators = useMemo(() => {
    const map = new Map<string, { username?: string; pointer?: { x: number; y: number; tool: 'pointer' } }>();
    for (const c of sync.remoteCursors) {
      map.set(c.peerId, {
        username: c.name,
        pointer: { x: c.x, y: c.y, tool: 'pointer' },
      });
    }
    return map;
  }, [sync.remoteCursors]);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col">
      {sync.isLive && (
        <span
          className={cn(
            'pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-good/15 px-1.5 py-0.5 font-medium text-good',
            chromeText.xs,
          )}
        >
          Live
        </span>
      )}
      <ExcalidrawWrapper
        dark={sync.dark}
        readOnly={sync.readOnly}
        isCollaborating={sync.isLive}
        initialData={payload}
        remoteRev={sync.rev}
        collaborators={collaborators}
        onChange={(next) => sync.setPayload(next)}
        onPointerUpdate={sync.onPointerUpdate}
      />
    </div>
  );
}
