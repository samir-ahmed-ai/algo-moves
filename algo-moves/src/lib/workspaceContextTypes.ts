import type { TrackId } from '../content';
import type { CanvasMode } from '../core';
import type { ThemePreset } from '../styles/themes/registry';
import type { LayoutPreset } from '../shell/canvas/layout';
import type {
  AppRoute,
  CanvasAddPanel,
  CanvasHudProps,
  CanvasProjectApi,
  CanvasZoomApi,
  Density,
  LayoutDir,
  Palette,
  Theme,
  Tweaks,
} from './workspace';

export interface WorkspaceCtx {
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
  activeItemId: string;
  /** Low-level item id setter — prefer {@link openProblem} when opening a problem from UI. */
  setActiveItemId: (id: string) => void;
  activeTopicId: string | null;
  setActiveTopicId: (id: string | null) => void;
  /** Browse track (Data Structures, Algorithms, Design, Interview Prep). */
  activeTrackId: TrackId | null;
  setActiveTrackId: (id: TrackId | null) => void;
  /** Browse category within a track — opens flat problem grid. */
  activeCategoryId: string | null;
  setActiveCategoryId: (id: string | null) => void;
  /** Top-level view: 'home' = landing launchpad, 'workspace' = canvas/studio. */
  route: AppRoute;
  /** Return to the home launchpad (writes #home). */
  goHome: () => void;
  /** Enter the workspace; pass an item id to open that problem directly. */
  enterWorkspace: (itemId?: string) => void;
  /** Open a problem in the workspace and leave browse grids. */
  openProblem: (id: string) => void;
  /** Enter the full-screen mobile swipe deck; pass a category id to open that category directly. */
  enterMobile: (categoryId?: string, itemId?: string) => void;
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
