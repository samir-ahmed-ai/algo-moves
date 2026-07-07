import { lazy, Suspense, useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';
import type { WhiteboardElement, WhiteboardPayload } from '@/lib/session/subdocProtocol';

const LazyExcalidraw = lazy(async () => {
  const mod = await import('@excalidraw/excalidraw');
  await import('@excalidraw/excalidraw/index.css');
  return { default: mod.Excalidraw };
});

type Collaborator = {
  readonly pointer?: {
    readonly x: number;
    readonly y: number;
    readonly tool: 'pointer' | 'laser';
  };
  readonly username?: string;
  readonly color?: { readonly background: string; readonly stroke: string };
};

type ExcalidrawAPI = {
  updateScene: (scene: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    collaborators?: Map<string, Collaborator>;
  }) => void;
  getSceneElements: () => readonly unknown[];
  /** Registers binary blobs (pasted/inserted images) so image elements render. */
  addFiles?: (files: unknown[]) => void;
};

export interface ExcalidrawWrapperProps {
  readonly className?: string;
  readonly dark?: boolean;
  readonly readOnly?: boolean;
  readonly isCollaborating?: boolean;
  readonly initialData?: WhiteboardPayload;
  /** Monotonic revision — bump to trigger a remote updateScene. */
  readonly remoteRev?: number;
  /** Apply the remote scroll/zoom (follow-me). Off by default so remote element
   * edits never yank a viewer's own pan. */
  readonly applyRemoteViewport?: boolean;
  readonly collaborators?: Map<string, Collaborator>;
  readonly onChange?: (payload: WhiteboardPayload) => void;
  readonly onPointerUpdate?: (payload: {
    readonly pointer: { readonly x: number; readonly y: number };
    readonly button: 'up' | 'down';
  }) => void;
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
    image: true,
  },
};

const DEBOUNCE_MS = 150;

function afterNextFrame(fn: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(fn);
    return;
  }
  setTimeout(fn, 0);
}

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
    const files = Object.values(initialData.files ?? {});
    if (files.length) apiRef.current.addFiles?.(files);
    apiRef.current.updateScene({
      elements: initialData.elements as unknown[],
      appState,
    });
    afterNextFrame(() => {
      applyingRemote.current = false;
    });
  }, [remoteRev, initialData, applyRemoteViewport]);

  // Update collaborator pointers
  useEffect(() => {
    if (!apiRef.current || !collaborators) return;
    apiRef.current.updateScene({ collaborators });
  }, [collaborators]);

  const handleChange = useCallback(
    (
      elements: readonly WhiteboardElement[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>,
    ) => {
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
    <div
      className={cn(
        'whiteboard-canvas-shell nowheel nodrag h-full min-h-[280px] w-full',
        className,
      )}
    >
      <Suspense
        fallback={
          <div className="whiteboard-loading-state flex h-full min-h-[280px] items-center justify-center text-ink3 text-sm">
            Loading whiteboard…
          </div>
        }
      >
        <LazyExcalidraw
          excalidrawAPI={(api: unknown) => {
            apiRef.current = api as ExcalidrawAPI;
          }}
          theme={dark ? 'dark' : 'light'}
          gridModeEnabled={false}
          viewModeEnabled={readOnly}
          zenModeEnabled={false}
          isCollaborating={isCollaborating}
          initialData={initialScene}
          onChange={handleChange as never}
          onPointerUpdate={onPointerUpdate as never}
          {...(UI_OPTIONS ? { UIOptions: UI_OPTIONS } : {})}
        />
      </Suspense>
    </div>
  );
}
