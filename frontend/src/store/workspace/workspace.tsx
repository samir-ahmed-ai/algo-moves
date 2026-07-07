import type { CanvasMode } from '@/core';
import {
  DEFAULT_THEME_PRESET,
  THEME_META,
  THEME_PRESETS,
  normalizeThemePreset,
  type ThemePreset,
} from '@/styles/themes/registry';
import type { ProjectState } from '@/store/project-state/projectState';
import type {
  AlignKind,
  BgVariant,
  CanvasSnapRegion,
  EdgeOpts,
  LayoutPreset,
} from '@/lib/canvas/layoutPrefs';
import { normalizeLayoutPreset } from '@/lib/canvas/layoutPrefs';
import { DEFAULTS_KEY, LAST_ITEM_KEY } from './workspaceConstants';
import { readStorageText, writeStorageJson } from '@/store/persistence/storage';

/** Canvas align/undo/redo tool callbacks — the contract the workspace context
 * exposes to chrome. CanvasTools (shell) consumes this shape. */
export interface CanvasToolsProps {
  selCount: number;
  onAlign: (a: AlignKind) => void;
  onDistribute: (d: 'h' | 'v') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'ultra' | 'spacious';
export type Palette = 'default' | 'cb';
/** Which top-level surface is showing: home launchpad, canvas workspace, the mobile swipe deck, the Vim dojo, the two-player games arcade, the interview prep plans hub, or the user profile. */
export type AppRoute =
  'home' | 'workspace' | 'mobile' | 'vim' | 'dojo' | 'games' | 'plans' | 'resumes' | 'profile';
export type { ThemePreset, LayoutPreset, CanvasSnapRegion };
export { DEFAULT_THEME_PRESET, THEME_META, THEME_PRESETS, normalizeThemePreset };

export interface WorkspaceDefaults {
  density: Density;
  themePreset: ThemePreset;
  layoutPreset: LayoutPreset;
  autoplay: boolean;
  snap: boolean;
}

export { DEFAULTS_KEY, LAST_ITEM_KEY } from './workspaceConstants';

const DEFAULT_LAYOUT_PRESET: LayoutPreset = 'TraceFocus';

export function normalizeDensity(value: unknown): Density {
  return value === 'ultra' || value === 'spacious' ? value : 'compact';
}

export function normalizeWorkspaceDefaults(
  defaults: Partial<WorkspaceDefaults>,
): WorkspaceDefaults {
  return {
    density: normalizeDensity(defaults.density),
    themePreset: normalizeThemePreset(defaults.themePreset),
    layoutPreset: normalizeLayoutPreset(defaults.layoutPreset ?? DEFAULT_LAYOUT_PRESET),
    autoplay: defaults.autoplay === true,
    snap: defaults.snap === true,
  };
}

export function saveDefaults(d: WorkspaceDefaults): void {
  writeStorageJson(DEFAULTS_KEY, normalizeWorkspaceDefaults(d));
}

export function readLastItemId(): string | null {
  const itemId = readStorageText(LAST_ITEM_KEY, null)?.trim() ?? '';
  return itemId || null;
}

export type LayoutDir = 'TB' | 'LR';

/** Active tab in the unified right sidebar. */
export type RightSidebarTab = 'analysis' | 'canvas' | 'selection' | 'collab' | 'more';

/** Live canvas snapshot + apply hook registered by CanvasStage. */
export interface CanvasProjectApi {
  getProjectState: () => ProjectState;
  applyProjectState: (state: ProjectState) => void;
  applyWorkflowPreset: (preset: {
    mode: CanvasMode;
    layoutPreset: LayoutPreset;
    ensurePanels?: string[];
  }) => void;
}

/** Interview session controls registered by canvas chrome while the interview canvas is active. */
export interface CanvasInterviewControls {
  hasSession: boolean;
  isHost: boolean;
  sessionActive: boolean;
  timerRunning: boolean;
  locked: boolean;
  start: () => void;
  copyInvite: () => void | Promise<void>;
  toggleTimer: () => void;
  resetTimer: () => void;
  toggleLock: () => void;
  end: () => void;
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
  onCanvasSnap: (region: CanvasSnapRegion) => void;
  canCanvasSnap: boolean;
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

export const tweakMeta: readonly { key: keyof Tweaks; label: string; hint: string }[] = [
  { key: 'moveLog', label: 'Move log', hint: 'The chess-style transcript' },
  { key: 'caption', label: 'Captions', hint: 'Plain-English narration' },
  { key: 'controls', label: 'Global transport', hint: 'Show bottom-centre play / step bar' },
  { key: 'animate', label: 'Animations', hint: 'Panel + node transitions' },
  { key: 'narrate', label: 'Narration', hint: 'Speak captions aloud (text-to-speech)' },
  { key: 'sound', label: 'Sound cues', hint: 'A short tone on each step' },
];
