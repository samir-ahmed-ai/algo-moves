import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';
import type { PanelNodeStyle } from '@/core/panelFlowTypes';

/**
 * Persisted canvas layouts (#73, #76). Per `${pluginId}:${mode}` key we store dragged
 * positions/resizes, panel chrome state, viewport, and which panels were trash-removed.
 */
export interface SavedNode {
  position: { x: number; y: number };
  width?: number;
  height?: number;
  parentId?: string;
  layoutSlots?: (string | null)[];
  slotIndex?: number;
  collapsed?: boolean;
  locked?: boolean;
  accent?: string;
  style?: PanelNodeStyle;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface LayoutEntry {
  nodes: Record<string, SavedNode>;
  removed: string[];
  /** Shell edge ids the user deleted (e.g. optional problem→viz). */
  removedEdges?: string[];
  /** Last camera position for this plugin+mode canvas. */
  viewport?: CanvasViewport;
}

const KEY = STORAGE_KEYS.LAYOUTS;

function load(): Record<string, LayoutEntry> {
  return readStorageJson(KEY, {});
}

const store = createSyncStore<Record<string, LayoutEntry>>(KEY, load);

export function loadLayouts(): Record<string, LayoutEntry> {
  return store.get();
}

export function saveLayouts(data: Record<string, LayoutEntry>) {
  store.set(data);
}

export function useLayouts(): Record<string, LayoutEntry> {
  return store.use();
}
