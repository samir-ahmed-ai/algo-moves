import type { SessionMeta } from '@/lib/session';
import type { TrackId } from '@/content';
import type { CanvasMode } from '@/core';
import type { ThemePreset } from '@/styles/themes/registry';
import type { LayoutPreset } from '@/lib/canvas/layoutPrefs';
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
} from './workspace';

export interface WorkspaceAppearanceCtx {
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
}

export interface WorkspaceChromeCtx {
  menuOpen: boolean;
  setMenuOpen: (b: boolean) => void;
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
  sidePanelTab: string | null;
  setSidePanelTab: (id: string | null) => void;
  rightTab: RightSidebarTab;
  setRightTab: (tab: RightSidebarTab) => void;
  canvasAdd: CanvasAddPanel | null;
  setCanvasAdd: (v: CanvasAddPanel | null) => void;
  canvasProject: CanvasProjectApi | null;
  setCanvasProject: (v: CanvasProjectApi | null) => void;
  canvasHud: CanvasHudProps | null;
  setCanvasHud: (v: CanvasHudProps | null) => void;
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

export interface WorkspaceNavigationCtx {
  mode: CanvasMode;
  setMode: (m: CanvasMode) => void;
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
  /** Return to the home launchpad (writes `/home`). */
  goHome: () => void;
  /** Enter the workspace; pass an item id to open that problem directly. */
  enterWorkspace: (itemId?: string) => void;
  /** Open the standalone freeform canvas (no problem nodes). */
  enterCanvas: () => void;
  /** Alias for {@link enterCanvas} — collab / interview surface. */
  enterCollabCanvas: () => void;
  /** Open a problem in a specific workspace mode (play or learn). */
  enterProblemInMode: (id: string, mode: CanvasMode) => void;
  /** Open a problem in the workspace and leave browse grids. */
  openProblem: (id: string) => void;
  /** True while a problem page is open (hides browse grids). */
  problemFocused: boolean;
  setProblemFocused: (b: boolean) => void;
  /** Return from a problem page to the browse grid when one is active. */
  backToBrowse: () => void;
  /** Product session kind derived from navigation (collab room overrides via {@link useWorkspaceSession}). */
  session: SessionMeta;
  /** Enter the full-screen mobile swipe deck; pass a category id to open that category directly. */
  enterMobile: (categoryId?: string, itemId?: string) => void;
  /** Enter the Vim Dojo maze trainer; pass a level id to open that level directly. */
  enterVim: (levelId?: string) => void;
  /** Enter the two-player games arcade; pass a room code to join that room directly. */
  enterGames: (roomCode?: string) => void;
  /** Enter the interview prep plans hub. */
  enterPlans: () => void;
  /** Enter the resume template creator hub. */
  enterResumes: () => void;
}

export type WorkspaceCtx = WorkspaceAppearanceCtx & WorkspaceChromeCtx & WorkspaceNavigationCtx;
