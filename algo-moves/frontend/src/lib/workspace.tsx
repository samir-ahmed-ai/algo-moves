import type { CanvasMode } from '../core';
import {
  DEFAULT_THEME_PRESET,
  THEME_META,
  THEME_PRESETS,
  normalizeThemePreset,
  type ThemePreset,
} from '../styles/themes/registry';
import type { ProjectState } from './projectState';
import type { CanvasToolsProps } from '../shell/canvas/CanvasTools';
import type { BgVariant, EdgeOpts, LayoutPreset } from '../shell/canvas/layout';
import { DEFAULTS_KEY, LAST_ITEM_KEY } from './workspaceConstants';
import { readStorageText, writeStorageJson } from './storage';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'ultra' | 'spacious';
export type Palette = 'default' | 'cb';
/** Which top-level surface is showing: home launchpad, canvas workspace, the mobile swipe deck, the Vim dojo, or the two-player games arcade. */
export type AppRoute = 'home' | 'workspace' | 'mobile' | 'vim' | 'games';
export type { ThemePreset, LayoutPreset };
export { DEFAULT_THEME_PRESET, THEME_META, THEME_PRESETS, normalizeThemePreset };

export interface WorkspaceDefaults {
  density: Density;
  themePreset: ThemePreset;
  layoutPreset: LayoutPreset;
  autoplay: boolean;
  snap: boolean;
}

export { DEFAULTS_KEY, LAST_ITEM_KEY } from './workspaceConstants';

export function saveDefaults(d: WorkspaceDefaults) {
  writeStorageJson(DEFAULTS_KEY, d);
}

export function readLastItemId(): string | null {
  return readStorageText(LAST_ITEM_KEY, null);
}

export type LayoutDir = 'TB' | 'LR';

/** Active tab in the unified right sidebar. */
export type RightSidebarTab = 'analysis' | 'canvas' | 'selection' | 'more';

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

export { WorkspaceProvider } from './workspaceContext';
export { useWorkspace } from './useWorkspace';
