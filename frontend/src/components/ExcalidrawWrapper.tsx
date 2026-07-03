import { lazy, Suspense, useCallback, useMemo, useRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';
import type { WhiteboardElement, WhiteboardPayload } from '@/shell/canvas/collab/subdocProtocol';

const LazyExcalidraw = lazy(async () => {
  const mod = await import('@excalidraw/excalidraw');
  await import('@excalidraw/excalidraw/index.css');
  return { default: mod.Excalidraw };
});

type Collaborator = {
  pointer?: { x: number; y: number; tool: 'pointer' | 'laser' };
  username?: string;
  color?: { background: string; stroke: string };
};

export interface ExcalidrawWrapperProps {
  className?: string;
  dark?: boolean;
  readOnly?: boolean;
  isCollaborating?: boolean;
  initialData?: WhiteboardPayload;
  collaborators?: Map<string, Collaborator>;
  onChange?: (payload: WhiteboardPayload) => void;
  onPointerUpdate?: (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => void;
}

const UI_OPTIONS: ComponentProps<typeof LazyExcalidraw>['UIOptions'] = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: true,
    export: { saveFileToDisk: true },
    loadScene: false,
    saveToActiveFile: false,
    toggleTheme: false,
  },
  tools: {
    image: false,
  },
};

export function ExcalidrawWrapper({
  className,
  dark = true,
  readOnly = false,
  isCollaborating = false,
  initialData,
  collaborators,
  onChange,
  onPointerUpdate,
}: ExcalidrawWrapperProps) {
  const lastEmit = useRef(0);

  const scene = useMemo(
    () => ({
      elements: (initialData?.elements ?? []) as never[],
      appState: {
        viewBackgroundColor: 'transparent',
        ...(initialData?.appState ?? {}),
      },
      files: (initialData?.files ?? {}) as never,
    }),
    [initialData],
  );

  const handleChange = useCallback(
    (elements: readonly WhiteboardElement[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastEmit.current < 120) return;
      lastEmit.current = now;
      onChange?.({
        elements: [...elements],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files: { ...files },
      });
    },
    [onChange],
  );

  return (
    <div className={cn('nowheel nodrag h-full min-h-[280px] w-full', className)}>
      <Suspense
        fallback={
          <div className="flex h-full min-h-[280px] items-center justify-center text-ink3 text-sm">
            Loading whiteboard…
          </div>
        }
      >
        <LazyExcalidraw
          theme={dark ? 'dark' : 'light'}
          gridModeEnabled={false}
          viewModeEnabled={readOnly}
          zenModeEnabled={false}
          isCollaborating={isCollaborating}
          initialData={scene}
          onChange={handleChange as never}
          onPointerUpdate={onPointerUpdate as never}
          UIOptions={UI_OPTIONS}
          {...(collaborators ? ({ collaborators } as Record<string, unknown>) : {})}
        />
      </Suspense>
    </div>
  );
}
