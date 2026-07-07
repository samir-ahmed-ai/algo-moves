import type { CanvasMode, ProblemPlugin } from '../../../core';
import { DOCK_ONLY_PANELS, modeBuiltins, modeOptional } from '../../../core/panelRegistry';
import type { LayoutPreset } from '@/lib/canvas/layoutPrefs';
import { STRUDEL_NODE_W } from '../tokens';

/** Persistence key for the standalone freeform canvas (not tied to a catalog item). */
export const STANDALONE_CANVAS_KEY = 'standalone:visualize';

/** Width of the right-side dock that hosts `mode:'visualize'` plugin tabs (e.g. Cases). */
export const SIDE_DOCK_WIDTH = STRUDEL_NODE_W;

/** Built-in panels shown per mode by default (plugin tabs are added by their tab.mode). */
export const MODE_BUILTINS: Record<CanvasMode, string[]> = {
  play: modeBuiltins('visualize'),
  visualize: modeBuiltins('visualize'),
  learn: modeBuiltins('learn'),
};

/** Built-ins known to a mode but hidden until added from the ＋ menu. */
export const MODE_OPTIONAL: Record<CanvasMode, string[]> = {
  play: modeOptional('visualize'),
  visualize: modeOptional('visualize'),
  learn: modeOptional('learn'),
};

/** User-facing named presets (backlog) mapped to canonical {@link LayoutPreset} ids. */
export type NamedLayoutPreset = 'study' | 'exam' | 'demo';

export const NAMED_LAYOUT_PRESETS: Record<NamedLayoutPreset, LayoutPreset> = {
  study: 'TraceFocus',
  exam: 'Minimal',
  demo: 'Demo',
};

/** Resolve a named or canonical preset string; returns null when unknown. */
export function resolveNamedLayoutPreset(value: string): LayoutPreset | null {
  const lower = value.toLowerCase();
  if (lower in NAMED_LAYOUT_PRESETS) return NAMED_LAYOUT_PRESETS[lower as NamedLayoutPreset];
  if ((['Full', 'TraceFocus', 'Minimal', 'Theater', 'Demo'] as const).includes(value as LayoutPreset)) {
    return value as LayoutPreset;
  }
  return null;
}

/** UI copy for named presets — used by workflow picker and onboarding. */
export const NAMED_LAYOUT_PRESET_META: Record<
  NamedLayoutPreset,
  { label: string; description: string; layoutPreset: LayoutPreset }
> = {
  study: {
    label: 'Study',
    description: 'Core learn panels — workbench + practice',
    layoutPreset: 'TraceFocus',
  },
  exam: {
    label: 'Exam',
    description: 'Minimal panels for timed practice',
    layoutPreset: 'Minimal',
  },
  demo: {
    label: 'Demo',
    description: 'Theater layout + presentation hint',
    layoutPreset: 'Demo',
  },
};

/** UI copy for preset picker — icons stay in PresetPopover. */
export const LAYOUT_PRESET_META: Record<
  LayoutPreset,
  { label: string; description: string; sketch: string }
> = {
  Full: {
    label: 'Full',
    description: 'Every panel — maximum context',
    sketch: '[W][+][+][+]',
  },
  TraceFocus: {
    label: 'Trace focus',
    description: 'Core learn panels — workbench + practice',
    sketch: '[W] · predict · code',
  },
  Minimal: {
    label: 'Minimal',
    description: 'Bare essentials, no extras',
    sketch: '[W]',
  },
  Theater: {
    label: 'Theater',
    description: 'Wide workbench — presentation layout',
    sketch: '[████████W████████]',
  },
  Demo: {
    label: 'Demo',
    description: 'Theater layout + presentation hint',
    sketch: '[████W████] 🎯',
  },
};

/** Default panels each preset keeps per mode (undefined mode = keep all). */
const PRESET_KEEP: Record<LayoutPreset, Partial<Record<CanvasMode, string[]>>> = {
  Full: {},
  TraceFocus: {
    learn: ['predict', 'mastery', 'code'],
  },
  Minimal: {
    learn: ['predict', 'code'],
  },
  Theater: {},
  Demo: {},
};

/** Ids to mark removed for a preset (so buildFor hides them). Empty = show everything. */
export function presetRemoved(plugin: ProblemPlugin<any, any>, mode: CanvasMode, preset: LayoutPreset): string[] {
  const keep = PRESET_KEEP[preset]?.[mode];
  if (!keep) return [];
  return modeNodeIds(plugin, mode).filter((id) => !keep.includes(id));
}

/** All node ids a mode knows about (default + optional + tabs) — used for ＋-menu/edges/removal. */
export function modeNodeIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  const ids = [...MODE_BUILTINS[mode], ...MODE_OPTIONAL[mode], ...modeTabIds(plugin, mode)];
  if (mode === 'visualize' || mode === 'play') return ids.filter((id) => !DOCK_ONLY_PANELS.has(id));
  return ids;
}

function modeTabIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  return (plugin.tabs ?? []).filter((t) => tabInMode(t, mode) && !isSideTab(t)).map((t) => t.id);
}

function tabInMode(tab: { mode?: string }, mode: CanvasMode): boolean {
  const tm = tab.mode ?? 'visualize';
  if (mode === 'learn') return tm === 'learn' || tm === 'practice';
  if (mode === 'play') return tm === 'visualize';
  return tm === mode;
}

function isSideTab(tab: { mode?: string; side?: boolean }): boolean {
  return tab.side === true || (tab.mode ?? 'visualize') === 'visualize';
}

/** Optional panels that work on the standalone canvas without a loaded problem plugin. */
export const STANDALONE_ADDABLE_PANELS = ['notes', 'bookmarks', 'projects', 'whiteboard', 'collab-code'] as const;

export function standaloneNodeIds(): string[] {
  return [...STANDALONE_ADDABLE_PANELS];
}

/** Node ids shown by default (excludes optional, ＋-menu-only panels). */
export function defaultNodeIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  return [...MODE_BUILTINS[mode], ...modeTabIds(plugin, mode)];
}

export { tabInMode, isSideTab, modeTabIds };
