import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { catalog, type TrackId } from '../content';
import { normalizeCanvasMode, type CanvasMode } from '../core';
import { normalizeThemePreset, type ThemePreset } from '../styles/themes/registry';
import { readShareFromUrl } from './shareState';
import { useIsMobile } from './useMediaQuery';
import { isMobileHash, writeMobileHash } from '../shell/mobile/mobileHash';
import { isVimHash, writeVimHash } from '../shell/vim/engine/vimHash';
import { initialBrowseFromHash } from './browseNavigation';
import type { LayoutPreset } from '../shell/canvas/layout';
import { BOTTOM_RAIL_H, SIDEBAR_RAIL_W, SIDEBAR_W, SIDEBAR_WIDE_W } from '../shell/SidebarShell';
import type {
  AppRoute,
  CanvasAddPanel,
  CanvasHudProps,
  CanvasProjectApi,
  Density,
  LayoutDir,
  Palette,
  RightSidebarTab,
  Theme,
  Tweaks,
  WorkspaceDefaults,
} from './workspace';
import { DEFAULTS_KEY, LAST_ITEM_KEY } from './workspaceConstants';
import { WorkspaceContext } from './workspaceContextStore';
import { readStorageJson, writeStorageText } from './storage';

function loadDefaults(): Partial<WorkspaceDefaults> {
  return readStorageJson(DEFAULTS_KEY, {});
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const savedDefaults = useRef(loadDefaults()).current;
  const shared = useRef(readShareFromUrl()).current;
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(shared?.theme === 'light' ? 'light' : 'dark');
  const [density, setDensity] = useState<Density>(savedDefaults.density ?? 'compact');
  const [palette, setPalette] = useState<Palette>(shared?.palette === 'cb' ? 'cb' : 'default');
  const [themePreset, setThemePreset] = useState<ThemePreset>(
    normalizeThemePreset(savedDefaults.themePreset ?? shared?.themePreset),
  );
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(savedDefaults.layoutPreset ?? 'Study');
  const [tweaks, setTweaks] = useState<Tweaks>({
    moveLog: true,
    caption: true,
    controls: true,
    animate: true,
    narrate: false,
    sound: false,
  });
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightWide, setRightWide] = useState(false);
  const [present, setPresent] = useState(() => typeof location !== 'undefined' && /[?&]embed\b/.test(location.search));
  const [focusCanvas, setFocusCanvas] = useState(false);
  const [dir, setDir] = useState<LayoutDir>(shared?.dir === 'TB' ? 'TB' : 'LR');
  const [mode, setMode] = useState<CanvasMode>(() => normalizeCanvasMode(shared?.mode));
  const [sidePanelTab, setSidePanelTab] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightSidebarTab>('analysis');
  const [activeItemId, setActiveItemId] = useState(
    shared?.item && catalog.getItem(shared.item) ? shared.item : catalog.firstItemId,
  );
  const initialBrowse = useRef(
    typeof location === 'undefined'
      ? { trackId: null, categoryId: null, topicId: null }
      : initialBrowseFromHash(location.hash, shared?.item),
  ).current;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(initialBrowse.topicId);
  const [activeTrackId, setActiveTrackId] = useState<TrackId | null>(initialBrowse.trackId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialBrowse.categoryId);
  const [route, setRoute] = useState<AppRoute>(() => {
    if (shared?.item && catalog.getItem(shared.item)) return 'workspace';
    if (typeof location !== 'undefined') {
      const hash = location.hash;
      if (isMobileHash(hash)) return 'mobile';
      if (isVimHash(hash)) return 'vim';
      if (hash === '#home') return 'home';
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) return 'mobile';
    }
    return 'home';
  });
  const [canvasAdd, setCanvasAdd] = useState<CanvasAddPanel | null>(null);
  const [canvasProject, setCanvasProject] = useState<CanvasProjectApi | null>(null);
  const [canvasHud, setCanvasHud] = useState<CanvasHudProps | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tracePreviewOpen, setTracePreviewOpen] = useState(false);
  const [mobileTransportOpen, setMobileTransportOpen] = useState(false);
  const [fitCanvasSignal, setFitCanvasSignal] = useState(0);
  const requestFitCanvas = useCallback(() => setFitCanvasSignal((n) => n + 1), []);

  const cycleDensity = useCallback(() => {
    setDensity((d) => (d === 'compact' ? 'ultra' : d === 'ultra' ? 'spacious' : 'compact'));
  }, []);

  const goHome = useCallback(() => {
    setRoute('home');
    if (typeof location !== 'undefined') {
      history.replaceState(null, '', `${location.pathname}${location.search}#home`);
    }
  }, []);

  const openProblem = useCallback((id: string) => {
    setActiveItemId(id);
    setActiveTopicId(null);
    setActiveTrackId(null);
    setActiveCategoryId(null);
    setRoute('workspace');
  }, []);

  const enterWorkspace = useCallback(
    (itemId?: string) => {
      if (itemId) openProblem(itemId);
      else setRoute('workspace');
    },
    [openProblem],
  );

  const enterMobile = useCallback((categoryId?: string, itemId?: string) => {
    setActiveCategoryId(categoryId ?? null);
    setActiveTopicId(categoryId ? `browse-${categoryId}` : null);
    setRoute('mobile');
    writeMobileHash(categoryId ? { categoryId, itemId } : null);
  }, []);

  const enterVim = useCallback((levelId?: string) => {
    setRoute('vim');
    writeVimHash(levelId ? { levelId } : null);
  }, []);

  const toggleFocusCanvas = useCallback(() => {
    setFocusCanvas((f) => {
      const next = !f;
      if (next) {
        setLeftOpen(false);
        setRightOpen(false);
      }
      requestFitCanvas();
      return next;
    });
  }, [requestFitCanvas]);

  // Remember the last problem opened in the workspace for the home page's "Continue".
  useEffect(() => {
    if (route === 'workspace' && activeItemId) {
      writeStorageText(LAST_ITEM_KEY, activeItemId);
    }
  }, [route, activeItemId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('cb', palette === 'cb');
  }, [palette]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themePreset);
  }, [themePreset]);

  // Sync chrome dimension CSS variables for viewport-fill layouts.
  useEffect(() => {
    const root = document.documentElement;
    if (present) {
      root.style.setProperty('--chrome-left', '0px');
      root.style.setProperty('--chrome-right', '0px');
      root.style.setProperty('--chrome-bottom', '0px');
      return;
    }
    // On mobile the sidebars float over the canvas as drawers, so they never
    // reserve flex width — keep the chrome offsets at the slim rail size.
    const left = !isMobile && leftOpen && !focusCanvas ? `${SIDEBAR_W}px` : `${SIDEBAR_RAIL_W}px`;
    let right = `${SIDEBAR_RAIL_W}px`;
    if (!isMobile && rightOpen && !focusCanvas) {
      right = `${rightWide ? SIDEBAR_WIDE_W : SIDEBAR_W}px`;
    }
    root.style.setProperty('--chrome-left', left);
    root.style.setProperty('--chrome-right', right);
    root.style.setProperty('--chrome-bottom', '0px');
    root.style.setProperty('--bottom-rail-h', `${BOTTOM_RAIL_H}px`);
  }, [present, leftOpen, rightOpen, rightWide, focusCanvas, isMobile]);

  const toggleTweak = (k: keyof Tweaks) => setTweaks((t) => ({ ...t, [k]: !t[k] }));

  return (
    <WorkspaceContext.Provider
      value={{
        theme,
        setTheme,
        density,
        setDensity,
        cycleDensity,
        palette,
        setPalette,
        themePreset,
        setThemePreset,
        layoutPreset,
        setLayoutPreset,
        tweaks,
        toggleTweak,
        leftOpen,
        setLeftOpen,
        rightOpen,
        setRightOpen,
        rightWide,
        setRightWide,
        present,
        setPresent,
        focusCanvas,
        toggleFocusCanvas,
        dir,
        setDir,
        mode,
        setMode,
        sidePanelTab,
        setSidePanelTab,
        rightTab,
        setRightTab,
        activeItemId,
        setActiveItemId,
        activeTopicId,
        setActiveTopicId,
        activeTrackId,
        setActiveTrackId,
        activeCategoryId,
        setActiveCategoryId,
        route,
        goHome,
        enterWorkspace,
        openProblem,
        enterMobile,
        enterVim,
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
