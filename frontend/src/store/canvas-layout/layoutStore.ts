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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id ? id : null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function nonNegativeInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined;
}

function compactIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const rawId of value) {
    const id = normalizeId(rawId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function normalizeLayoutSlots(value: unknown): (string | null)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((slot) => normalizeId(slot));
}

function normalizeViewport(value: unknown): CanvasViewport | undefined {
  if (!isRecord(value)) return undefined;
  const zoom = positiveNumber(value.zoom);
  if (zoom === undefined) return undefined;
  return {
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    zoom,
  };
}

function normalizeSavedNode(value: unknown): SavedNode | null {
  if (!isRecord(value) || !isRecord(value.position)) return null;
  const width = positiveNumber(value.width);
  const height = positiveNumber(value.height);
  const parentId = normalizeId(value.parentId);
  const layoutSlots = normalizeLayoutSlots(value.layoutSlots);
  const slotIndex = nonNegativeInt(value.slotIndex);
  const accent = normalizeId(value.accent);
  return {
    position: {
      x: finiteNumber(value.position.x, 0),
      y: finiteNumber(value.position.y, 0),
    },
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(parentId ? { parentId } : {}),
    ...(layoutSlots ? { layoutSlots } : {}),
    ...(slotIndex !== undefined ? { slotIndex } : {}),
    ...(value.collapsed === true ? { collapsed: true } : {}),
    ...(value.locked === true ? { locked: true } : {}),
    ...(accent ? { accent } : {}),
    ...(value.style ? { style: value.style as PanelNodeStyle } : {}),
  };
}

function normalizeNodes(value: unknown): Record<string, SavedNode> {
  if (!isRecord(value)) return {};
  const nodes: Record<string, SavedNode> = {};
  for (const [rawId, rawNode] of Object.entries(value)) {
    const id = normalizeId(rawId);
    const node = normalizeSavedNode(rawNode);
    if (id && node) nodes[id] = node;
  }
  return nodes;
}

function normalizeLayoutEntry(value: unknown): LayoutEntry | null {
  if (!isRecord(value)) return null;
  const nodes = normalizeNodes(value.nodes);
  const removedEdges = compactIds(value.removedEdges);
  const viewport = normalizeViewport(value.viewport);
  return {
    nodes,
    removed: compactIds(value.removed),
    ...(removedEdges.length ? { removedEdges } : {}),
    ...(viewport ? { viewport } : {}),
  };
}

function normalizeLayouts(value: unknown): Record<string, LayoutEntry> {
  if (!isRecord(value)) return {};
  const layouts: Record<string, LayoutEntry> = {};
  for (const [rawKey, rawEntry] of Object.entries(value)) {
    const key = normalizeId(rawKey);
    const entry = normalizeLayoutEntry(rawEntry);
    if (key && entry) layouts[key] = entry;
  }
  return layouts;
}

function load(): Record<string, LayoutEntry> {
  return normalizeLayouts(readStorageJson(KEY, {}));
}

const store = createSyncStore<Record<string, LayoutEntry>>(KEY, load);

export function loadLayouts(): Record<string, LayoutEntry> {
  return store.get();
}

export function saveLayouts(data: Record<string, LayoutEntry>): void {
  store.set(normalizeLayouts(data));
}

export function useLayouts(): Record<string, LayoutEntry> {
  return store.use();
}
