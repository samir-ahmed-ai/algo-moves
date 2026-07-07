import type { CanvasMode } from './types';

export type PanelCategory =
  | 'Visualize'
  | 'Practice'
  | 'Progress'
  | 'Reference'
  | 'Code'
  | 'Workspace'
  | 'Problem'
  | 'Effects'
  | 'Other';

export interface PanelConfigEntry {
  id: string;
  title: string;
  category: PanelCategory;
  /** Default modes this panel can appear in. */
  modes: CanvasMode[];
  /** Shown by default (not ＋-menu only). */
  builtin?: boolean;
  /** Optional-only — hidden until added from sidebar. */
  optional?: boolean;
  /** Per-mode default when builtin/optional differ across modes. */
  modeFlags?: Partial<Record<CanvasMode, 'builtin' | 'optional'>>;
  /** Sidebar-only in visualize — not spawned as canvas nodes. */
  sidebarOnly?: boolean;
}

function normalizePanelId(id: string): string {
  return id.trim();
}

function safePosition(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
  };
}

function panelModeRole(p: PanelConfigEntry, mode: CanvasMode): 'builtin' | 'optional' | null {
  if (!p.modes.includes(mode)) return null;
  const flag = p.modeFlags?.[mode];
  if (flag) return flag;
  if (p.builtin) return 'builtin';
  if (p.optional) return 'optional';
  return null;
}

/** Ordered category buckets for sidebar / add menu. */
export const CATEGORY_ORDER: readonly PanelCategory[] = [
  'Visualize',
  'Practice',
  'Progress',
  'Reference',
  'Code',
  'Workspace',
  'Problem',
  'Effects',
  'Other',
];

/** Unified panel registry — single source for titles, categories, and mode visibility. */
export const panelsConfig: readonly PanelConfigEntry[] = [
  {
    id: 'workbench',
    title: 'Workbench',
    category: 'Problem',
    modes: ['visualize'],
    optional: true,
  },
  { id: 'replay', title: 'Replay', category: 'Visualize', modes: ['visualize'], sidebarOnly: true },
  {
    id: 'inspector',
    title: 'Inspector',
    category: 'Visualize',
    modes: ['visualize'],
    sidebarOnly: true,
  },
  {
    id: 'metrics',
    title: 'Metrics',
    category: 'Visualize',
    modes: ['visualize'],
    sidebarOnly: true,
  },
  {
    id: 'bigo',
    title: 'Cost (Big-O)',
    category: 'Visualize',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'bookmarks',
    title: 'Bookmarks',
    category: 'Workspace',
    modes: ['visualize'],
    optional: true,
  },
  { id: 'editor', title: 'Input editor', category: 'Code', modes: ['visualize'], optional: true },
  { id: 'pattern', title: 'Pattern', category: 'Reference', modes: ['visualize'], optional: true },
  {
    id: 'glossary',
    title: 'Glossary',
    category: 'Reference',
    modes: ['visualize'],
    optional: true,
  },
  { id: 'diff', title: 'Frame diff', category: 'Visualize', modes: ['visualize'], optional: true },
  { id: 'watch', title: 'Watch', category: 'Visualize', modes: ['visualize'], optional: true },
  {
    id: 'path',
    title: 'Learning path',
    category: 'Progress',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'cheatsheet',
    title: 'Cheat sheet',
    category: 'Reference',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'projects',
    title: 'Projects',
    category: 'Workspace',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'notes',
    title: 'Notes',
    category: 'Workspace',
    modes: ['visualize', 'learn'],
    optional: true,
  },
  {
    id: 'whiteboard',
    title: 'Whiteboard',
    category: 'Visualize',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'collab-code',
    title: 'Collab Code Studio',
    category: 'Code',
    modes: ['visualize'],
    optional: true,
  },
  {
    id: 'code',
    title: 'Code Studio',
    category: 'Code',
    modes: ['learn'],
    builtin: true,
  },
  { id: 'reassemble', title: 'Structure', category: 'Code', modes: ['visualize'], optional: true },
  { id: 'recall', title: 'Recall', category: 'Code', modes: ['visualize'], optional: true },
  {
    id: 'predict',
    title: 'Predict the move',
    category: 'Practice',
    modes: ['learn'],
    optional: true,
  },
  { id: 'mastery', title: 'Mastery', category: 'Progress', modes: ['learn'], optional: true },
  { id: 'mistakes', title: 'Mistake log', category: 'Progress', modes: ['learn'], optional: true },
  {
    id: 'explain',
    title: 'Explain it back',
    category: 'Practice',
    modes: ['learn'],
    optional: true,
  },
  { id: 'badges', title: 'Badges', category: 'Progress', modes: ['learn'], optional: true },
  { id: 'hints', title: 'Hints', category: 'Reference', modes: ['learn'], optional: true },
  {
    id: 'complexity',
    title: 'Complexity quiz',
    category: 'Practice',
    modes: ['learn'],
    optional: true,
  },
  { id: 'edgecases', title: 'Edge cases', category: 'Practice', modes: ['learn'], optional: true },
  { id: 'copy', title: 'Copy', category: 'Code', modes: ['learn'], optional: true },
  { id: 'scratch', title: 'Scratchpad', category: 'Code', modes: ['learn'], optional: true },
];

const byId = new Map<string, PanelConfigEntry>();
for (const p of panelsConfig) {
  const id = normalizePanelId(p.id);
  if (!id) continue;
  if (byId.has(id)) {
    if (import.meta.env.DEV) {
      console.warn(`[panelRegistry] Duplicate panel id "${p.id}" kept only first occurrence`);
    }
    continue;
  }
  byId.set(id, p);
}

const panelConfigs = Array.from(byId.values());

export function getPanelConfig(id: string): PanelConfigEntry | undefined {
  return byId.get(normalizePanelId(id));
}

export function panelTitle(id: string, fallback?: string): string {
  const panelId = normalizePanelId(id);
  return byId.get(panelId)?.title ?? fallback ?? panelId;
}

export function panelCategory(id: string): PanelCategory {
  return byId.get(normalizePanelId(id))?.category ?? 'Other';
}

export function modeBuiltins(mode: CanvasMode): string[] {
  return panelConfigs.filter((p) => panelModeRole(p, mode) === 'builtin').map((p) => p.id);
}

export function modeOptional(mode: CanvasMode): string[] {
  return panelConfigs.filter((p) => panelModeRole(p, mode) === 'optional').map((p) => p.id);
}

export const SIDEBAR_ONLY_PANELS = new Set(
  panelConfigs.filter((p) => p.sidebarOnly).map((p) => p.id),
);

/** @deprecated Use {@link SIDEBAR_ONLY_PANELS} */
export const DOCK_ONLY_PANELS = SIDEBAR_ONLY_PANELS;

let panelCounter = 0;

/** Factory for dynamically spawned panels (drag-from-sidebar). */
export function createPanelByType(kind: string, position: { x: number; y: number }) {
  const panelKind = normalizePanelId(kind) || 'panel';
  panelCounter += 1;
  return {
    id: `${panelKind}-${panelCounter}-${Date.now().toString(36)}`,
    type: 'panel' as const,
    position: safePosition(position),
    data: {
      kind: panelKind,
      title: panelTitle(panelKind),
      runState: 'paused' as const,
    },
  };
}

export type PanelRunState = 'running' | 'paused' | 'stopped';
