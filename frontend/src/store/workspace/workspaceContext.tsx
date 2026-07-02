import { useCallback, useRef, useState, type ReactNode } from 'react';
import { readShareFromUrl } from '@/store/navigation/shareState';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { readStorageJson } from '@/store/persistence/storage';
import type { CanvasAddPanel, CanvasHudProps, CanvasProjectApi, LayoutDir, WorkspaceDefaults } from './workspace';
import { DEFAULTS_KEY } from './workspaceConstants';
import { WorkspaceContext } from './workspaceContextStore';
import { useAppearanceState } from './useAppearanceState';
import { useChromeState } from './useChromeState';
import { useAppNavigation } from './useAppNavigation';

function loadDefaults(): Partial<WorkspaceDefaults> {
  return readStorageJson(DEFAULTS_KEY, {});
}

/**
 * Composes the three workspace state domains — appearance, chrome layout and app
 * navigation — plus the canvas-API registration slots into the single workspace
 * context. Each domain lives in its own hook; this provider is the integrator.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const savedDefaults = useRef(loadDefaults()).current;
  const shared = useRef(readShareFromUrl()).current;
  const isMobile = useIsMobile();

  const [fitCanvasSignal, setFitCanvasSignal] = useState(0);
  const requestFitCanvas = useCallback(() => setFitCanvasSignal((n) => n + 1), []);

  const appearance = useAppearanceState(shared, savedDefaults);
  const initialDir: LayoutDir = shared?.dir === 'TB' ? 'TB' : 'LR';
  const chrome = useChromeState({ requestFitCanvas, isMobile, initialDir });
  const nav = useAppNavigation(shared);

  // Canvas registers its imperative API here so the shell chrome can drive it.
  const [canvasAdd, setCanvasAdd] = useState<CanvasAddPanel | null>(null);
  const [canvasProject, setCanvasProject] = useState<CanvasProjectApi | null>(null);
  const [canvasHud, setCanvasHud] = useState<CanvasHudProps | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tracePreviewOpen, setTracePreviewOpen] = useState(false);
  const [mobileTransportOpen, setMobileTransportOpen] = useState(false);

  return (
    <WorkspaceContext.Provider
      value={{
        ...appearance,
        ...chrome,
        ...nav,
        canvasAdd,
        setCanvasAdd,
        canvasProject,
        setCanvasProject,
        canvasHud,
        setCanvasHud,
        settingsOpen,
        setSettingsOpen,
        tracePreviewOpen,
        setTracePreviewOpen,
        mobileTransportOpen,
        setMobileTransportOpen,
        fitCanvasSignal,
        requestFitCanvas,
        isMobile,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
