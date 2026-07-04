import { lazy, Suspense, useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';
import type { WhiteboardElement, WhiteboardPayload } from '@/lib/session/subdocProtocol';

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

type ExcalidrawAPI = {
  updateScene: (scene: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    collaborators?: Map<string, Collaborator>;
  }) => void;
  getSceneElements: () => readonly unknown[];
};

export interface ExcalidrawWrapperProps {
  className?: string;
  dark?: boolean;
  readOnly?: boolean;
  isCollaborating?: boolean;
  initialData?: WhiteboardPayload;
  /** Monotonic revision — bump to trigger a remote updateScene. */
  remoteRev?: number;
  /** Apply the remote scroll/zoom (follow-me). Off by default so remote element
   * edits never yank a viewer's own pan. */
  applyRemoteViewport?: boolean;
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

const DEBOUNCE_MS = 150;

export function ExcalidrawWrapper({
  className,
  dark = true,
  readOnly = false,
  isCollaborating = false,
  initialData,
  remoteRev,
  applyRemoteViewport = false,
  collaborators,
  onChange,
  onPointerUpdate,
}: ExcalidrawWrapperProps) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const applyingRemote = useRef(false);
  const appliedRev = useRef(remoteRev ?? 0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialDataRef = useRef(initialData);

  const flushPending = useCallback(() => {
    if (debounceTimer.current != null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  useEffect(() => () => flushPending(), [flushPending]);

  // Apply remote scene updates when rev advances
  useEffect(() => {
    if (!apiRef.current || !initialData || remoteRev == null) return;
    if (remoteRev <= appliedRev.current) return;
    appliedRev.current = remoteRev;
    applyingRemote.current = true;
    // Never move the viewer's own pan/zoom on a remote element edit — only mirror
    // the remote viewport when explicitly following (follow-me).
    const remoteAppState = (initialData.appState ?? {}) as Record<string, unknown>;
    const { scrollX, scrollY, zoom, ...restAppState } = remoteAppState;
    const appState: Record<string, unknown> = {
      viewBackgroundColor: 'transparent',
      ...restAppState,
    };
    if (applyRemoteViewport) {
      if (scrollX !== undefined) appState.scrollX = scrollX;
      if (scrollY !== undefined) appState.scrollY = scrollY;
      if (zoom !== undefined) appState.zoom = zoom;
    }
    apiRef.current.updateScene({
      elements: initialData.elements as unknown[],
      appState,
    });
    requestAnimationFrame(() => {
      applyingRemote.current = false;
    });
  }, [remoteRev, initialData, applyRemoteViewport]);

  // Update collaborator pointers
  useEffect(() => {
    if (!apiRef.current || !collaborators) return;
    apiRef.current.updateScene({ collaborators });
  }, [collaborators]);

  const handleChange = useCallback(
    (elements: readonly WhiteboardElement[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      if (applyingRemote.current) return;
      flushPending();
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        onChangeRef.current?.({
          elements: [...elements],
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files: { ...files },
        });
      }, DEBOUNCE_MS);
    },
    [flushPending],
  );

  const initialScene = {
    elements: (initialDataRef.current?.elements ?? []) as never[],
    appState: {
      viewBackgroundColor: 'transparent',
      ...(initialDataRef.current?.appState ?? {}),
    },
    files: (initialDataRef.current?.files ?? {}) as never,
  };

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
          excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawAPI; }}
          theme={dark ? 'dark' : 'light'}
          gridModeEnabled={false}
          viewModeEnabled={readOnly}
          zenModeEnabled={false}
          isCollaborating={isCollaborating}
          initialData={initialScene}
          onChange={handleChange as never}
          onPointerUpdate={onPointerUpdate as never}
          UIOptions={UI_OPTIONS}
        />
      </Suspense>
    </div>
  );
}
