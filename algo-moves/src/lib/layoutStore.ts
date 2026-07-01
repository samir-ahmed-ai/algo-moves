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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Record<string, LayoutEntry>;
  } catch {
    // ignore corrupt/blocked storage
  }
  return {};
}

export function saveLayouts(data: Record<string, LayoutEntry>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota/private-mode failures
  }
}
