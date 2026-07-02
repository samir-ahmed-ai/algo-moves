import { readStorageJson, writeStorageJson } from './storage';

/**
 * Persisted canvas layouts (#73). Per `${pluginId}:${mode}` key we store dragged
 * positions/resizes and which panels were trash-removed, so a tweaked canvas
 * survives a reload. Plain localStorage — no provider needed.
 */
export interface SavedNode {
  position: { x: number; y: number };
  width?: number;
  height?: number;
}
export interface LayoutEntry {
  nodes: Record<string, SavedNode>;
  removed: string[];
  /** Shell edge ids the user deleted (e.g. optional problem→viz). */
  removedEdges?: string[];
}

const KEY = 'algo-moves:layouts';

export function loadLayouts(): Record<string, LayoutEntry> {
  return readStorageJson(KEY, {});
}

export function saveLayouts(data: Record<string, LayoutEntry>) {
  writeStorageJson(KEY, data);
}
