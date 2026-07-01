import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { catalog } from '../content';
import { normalizeCanvasMode, type CanvasMode } from '../core';
import {
  DEFAULT_THEME_PRESET,
  THEME_META,
  THEME_PRESETS,
  normalizeThemePreset,
  type ThemePreset,
} from '../styles/themes/registry';
import { readShareFromUrl } from './shareState';
import type { ProjectState } from './projectState';
import { useIsMobile } from './useMediaQuery';
import { parseMobileHash, writeMobileHash } from '../shell/mobile/mobileHash';
import type { CanvasToolsProps } from '../shell/canvas/CanvasTools';
import type { BgVariant, EdgeOpts, LayoutPreset } from '../shell/canvas/layout';
import { BOTTOM_RAIL_H, DEFAULT_DOCK_H, SIDEBAR_RAIL_W, SIDEBAR_W, SIDEBAR_WIDE_W } from '../shell/SidebarShell';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'ultra' | 'spacious';
export type Palette = 'default' | 'cb';
/** Which top-level surface is showing: home launchpad, canvas workspace, or the mobile swipe deck. */
export type AppRoute = 'home' | 'workspace' | 'mobile';
export type { ThemePreset, LayoutPreset };
export { DEFAULT_THEME_PRESET, THEME_META, THEME_PRESETS, normalizeThemePreset };

export interface WorkspaceDefaults {
  density: Density;
  themePreset: ThemePreset;
  layoutPreset: LayoutPreset;
  autoplay: boolean;
  snap: boolean;
}

const DEFAULTS_KEY = 'algo-moves:defaults';

function loadDefaults(): Partial<WorkspaceDefaults> {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as Partial<WorkspaceDefaults>) : {};
  } catch {
    return {};
  }
}

export function saveDefaults(d: WorkspaceDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

/** Last problem opened in the workspace — powers the home page's "Continue". */
export const LAST_ITEM_KEY = 'algo-moves:last-item';

export function readLastItemId(): string | null {
  try {
    return localStorage.getItem(LAST_ITEM_KEY);
  } catch {
    return null;
  }
}

export type LayoutDir = 'TB' | 'LR';

/** Live canvas snapshot + apply hook registered by CanvasStage. */
export interface CanvasProjectApi {
  getProjectState: () => ProjectState;
  applyProjectState: (state: ProjectState) => void;
  applyWorkflowPreset: (preset: { mode: CanvasMode; layoutPreset: LayoutPreset; ensurePanels?: string[] }) => void;
}

/** Optional add-panel API registered by CanvasStage while visualize mode is active. */
export interface CanvasAddPanel {
  addableKinds: { id: string; title: string }[];
  addableEffects?: { id: string; title: string }[];
  dndKey: string;
  effectDndKey?: string;
  onAddKind: (kind: string) => void;
  onAddEffect?: (effectId: string) => void;
}

/** Live zoom controls registered by CanvasStage (React Flow must stay on canvas). */
export interface CanvasZoomApi {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  onFit: () => void;
  onResetZoom: () => void;
}

/** Canvas chrome registered by CanvasStage for the unified right sidebar. */
export interface CanvasHudProps {
  edgeOpts: EdgeOpts;
  setEdgeOpts: (u: (o: EdgeOpts) => EdgeOpts) => void;
  bg: BgVariant;
  setBg: (b: BgVariant) => void;
  snap: boolean;
  setSnap: (b: boolean) => void;
  onPreset: (p: LayoutPreset) => void;
  onTidy: () => void;
  tools: CanvasToolsProps;
}

export interface Tweaks {
  moveLog: boolean;
  caption: boolean;
  controls: boolean;
  animate: boolean;
  narrate: boolean;
  sound: boolean;
}

export const tweakMeta: { key: keyof Tweaks; label: string; hint: string }[] = [
  { key: 'moveLog', label: 'Move log', hint: 'The chess-style transcript' },
  { key: 'caption', label: 'Captions', hint: 'Plain-English narration' },
  { key: 'controls', label: 'Global transport', hint: 'Show bottom-centre play / step bar' },
  { key: 'animate', label: 'Animations', hint: 'Panel + node transitions' },
  { key: 'narrate', label: 'Narration', hint: 'Speak captions aloud (text-to-speech)' },
  { key: 'sound', label: 'Sound cues', hint: 'A short tone on each step' },
];

interface WorkspaceCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  density: Density;
  setDensity: (d: Density) => void;
  cycleDensity: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
  themePreset: ThemePreset;
  setThemePreset: (t: ThemePreset) => void;
  layoutPreset: LayoutPreset;
  setLayoutPreset: (p: LayoutPreset) => void;
  tweaks: Tweaks;
  toggleTweak: (k: keyof Tweaks) => void;
  leftOpen: boolean;
  setLeftOpen: (b: boolean) => void;
  rightOpen: boolean;
  setRightOpen: (b: boolean) => void;
  rightWide: boolean;
  setRightWide: (b: boolean) => void;
  present: boolean;
  setPresent: (b: boolean) => void;
  focusCanvas: boolean;
  toggleFocusCanvas: () => void;
  dir: LayoutDir;
  setDir: (d: LayoutDir) => void;
  mode: CanvasMode;
  setMode: (m: CanvasMode) => void;
  sidePanelTab: string | null;
  setSidePanelTab: (id: string | null) => void;
  bottomDockOpen: boolean;
  setBottomDockOpen: (b: boolean) => void;
  bottomDockHeight: number;
  setBottomDockHeight: (h: number) => void;
  selectedNode: number | null;
  setSelectedNode: (n: number | null) => void;
  activeItemId: string;
  setActiveItemId: (id: string) => void;
  activeTopicId: string | null;
  setActiveTopicId: (id: string | null) => void;
  /** When set, the workspace shows every problem in the course grid (not a single topic). */
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  /** Top-level view: 'home' = landing launchpad, 'workspace' = canvas/studio. */
  route: AppRoute;
  /** Return to the home launchpad (writes #home). */
  goHome: () => void;
  /** Enter the workspace; pass an item id to open that problem directly. */
  enterWorkspace: (itemId?: string) => void;
  /** Enter the full-screen mobile swipe deck; pass a topic id to open that category directly. */
  enterMobile: (topicId?: string, itemId?: string) => void;
  canvasAdd: CanvasAddPanel | null;
  setCanvasAdd: (v: CanvasAddPanel | null) => void;
  canvasProject: CanvasProjectApi | null;
  setCanvasProject: (v: CanvasProjectApi | null) => void;
  canvasHud: CanvasHudProps | null;
  setCanvasHud: (v: CanvasHudProps | null) => void;
  canvasZoom: CanvasZoomApi | null;
  setCanvasZoom: (v: CanvasZoomApi | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;
  tracePreviewOpen: boolean;
  setTracePreviewOpen: (b: boolean) => void;
  mobileTransportOpen: boolean;
  setMobileTransportOpen: (b: boolean) => void;
  fitCanvasSignal: number;
  requestFitCanvas: () => void;
  /** True on phone-sized viewports; chrome renders as overlay drawers. */
  isMobile: boolean;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return c;
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
  const [bottomDockOpen, setBottomDockOpen] = useState(false);
  const [bottomDockHeight, setBottomDockHeight] = useState(DEFAULT_DOCK_H);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState(
    shared?.item && catalog.getItem(shared.item) ? shared.item : catalog.firstItemId,
  );
  const [activeTopicId, setActiveTopicId] = useState<string | null>(() => {
    if (typeof location === 'undefined') return null;
    return parseMobileHash(location.hash)?.topicId ?? null;
  });
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => {
    if (shared?.item && catalog.getItem(shared.item)) return 'workspace';
    if (typeof location !== 'undefined') {
      const hash = location.hash;
      if (hash.startsWith('#mobile')) return 'mobile';
      if (hash === '#home') return 'home';
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) return 'mobile';
    }
    return 'home';
  });
  const [canvasAdd, setCanvasAdd] = useState<CanvasAddPanel | null>(null);
  const [canvasProject, setCanvasProject] = useState<CanvasProjectApi | null>(null);
  const [canvasHud, setCanvasHud] = useState<CanvasHudProps | null>(null);
  const [canvasZoom, setCanvasZoom] = useState<CanvasZoomApi | null>(null);
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

  const enterWorkspace = useCallback((itemId?: string) => {
    if (itemId) {
      setActiveItemId(itemId);
      setActiveTopicId(null);
      setActiveCourseId(null);
    }
    setRoute('workspace');
  }, []);

  const enterMobile = useCallback((topicId?: string, itemId?: string) => {
    setActiveTopicId(topicId ?? null);
    setRoute('mobile');
    writeMobileHash(topicId ? { topicId, itemId } : null);
  }, []);

  const toggleFocusCanvas = useCallback(() => {
    setFocusCanvas((f) => {
      const next = !f;
      if (next) {
        setLeftOpen(false);
        setRightOpen(false);
        setBottomDockOpen(false);
      }
      requestFitCanvas();
      return next;
    });
  }, [requestFitCanvas]);

  // Remember the last problem opened in the workspace for the home page's "Continue".
  useEffect(() => {
    if (route === 'workspace' && activeItemId) {
      try {
        localStorage.setItem(LAST_ITEM_KEY, activeItemId);
      } catch {
        /* storage blocked — Continue simply won't persist */
      }
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
    const bottom =
      mode === 'visualize'
        ? bottomDockOpen && !focusCanvas
          ? `${bottomDockHeight}px`
          : `${BOTTOM_RAIL_H}px`
        : '0px';
    root.style.setProperty('--chrome-left', left);
    root.style.setProperty('--chrome-right', right);
    root.style.setProperty('--chrome-bottom', bottom);
    root.style.setProperty('--bottom-rail-h', `${BOTTOM_RAIL_H}px`);
    root.style.setProperty('--default-dock-h', `${bottomDockHeight}px`);
  }, [present, leftOpen, rightOpen, rightWide, bottomDockOpen, bottomDockHeight, focusCanvas, mode, isMobile]);

  const toggleTweak = (k: keyof Tweaks) => setTweaks((t) => ({ ...t, [k]: !t[k] }));

  return (
    <Ctx.Provider
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
        bottomDockOpen,
        setBottomDockOpen,
        bottomDockHeight,
        setBottomDockHeight,
        selectedNode,
        setSelectedNode,
        activeItemId,
        setActiveItemId,
        activeTopicId,
        setActiveTopicId,
        activeCourseId,
        setActiveCourseId,
        route,
        goHome,
        enterWorkspace,
        enterMobile,
        canvasAdd,
        setCanvasAdd,
        canvasProject,
        setCanvasProject,
        canvasHud,
        setCanvasHud,
        canvasZoom,
        setCanvasZoom,
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
    </Ctx.Provider>
  );
}
