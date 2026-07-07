import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { readShareFromUrl } from '@/store/navigation/shareState';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { readStorageJson } from '@/store/persistence/storage';
import { workspaceSessionMeta } from '@/lib/session';
import type { CanvasAddPanel, CanvasHudProps, CanvasProjectApi, LayoutDir, WorkspaceDefaults } from './workspace';
import { DEFAULTS_KEY } from './workspaceConstants';
import {
  WorkspaceAppearanceContext,
  WorkspaceChromeContext,
  WorkspaceNavigationContext,
} from './workspaceContextStore';
import { useAppearanceState } from './useAppearanceState';
import { useChromeState } from './useChromeState';
import { useAppNavigation } from './useAppNavigation';

function loadDefaults(): Partial<WorkspaceDefaults> {
  return readStorageJson(DEFAULTS_KEY, {});
}

/**
 * Composes appearance, chrome, and navigation domains into three focused contexts.
 * Each domain lives in its own hook; this provider is the integrator.
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

  const session = useMemo(
    () => workspaceSessionMeta({ mode: nav.mode, problemFocused: nav.problemFocused }),
    [nav.mode, nav.problemFocused],
  );

  const [canvasAdd, setCanvasAdd] = useState<CanvasAddPanel | null>(null);
  const [canvasProject, setCanvasProject] = useState<CanvasProjectApi | null>(null);
  const [canvasHud, setCanvasHud] = useState<CanvasHudProps | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tracePreviewOpen, setTracePreviewOpen] = useState(false);
  const [mobileTransportOpen, setMobileTransportOpen] = useState(false);

  const appearanceValue = useMemo(() => appearance, [appearance]);

  const chromeValue = useMemo(
    () => ({
      ...chrome,
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
    }),
    [
      chrome,
      canvasAdd,
      canvasProject,
      canvasHud,
      settingsOpen,
      tracePreviewOpen,
      mobileTransportOpen,
      fitCanvasSignal,
      requestFitCanvas,
      isMobile,
    ],
  );

  const navigationValue = useMemo(
    () => ({
      ...nav,
      session,
    }),
    [nav, session],
  );

  return (
    <WorkspaceAppearanceContext.Provider value={appearanceValue}>
      <WorkspaceChromeContext.Provider value={chromeValue}>
        <WorkspaceNavigationContext.Provider value={navigationValue}>{children}</WorkspaceNavigationContext.Provider>
      </WorkspaceChromeContext.Provider>
    </WorkspaceAppearanceContext.Provider>
  );
}
