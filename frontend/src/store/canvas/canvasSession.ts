import { useSyncExternalStore } from 'react';
import type { CanvasViewport } from '@/store/canvas-layout';
import { loadLayouts, saveLayouts } from '@/store/canvas-layout';

/** Read the persisted viewport for a canvas key, if any. */
export function getCanvasViewport(key: string): CanvasViewport | undefined {
  const normalizedKey = normalizeCanvasKey(key);
  return normalizedKey ? loadLayouts()[normalizedKey]?.viewport : undefined;
}

/** Persist the camera for a canvas key without disturbing node layout. */
export function saveCanvasViewport(key: string, viewport: CanvasViewport) {
  const normalizedKey = normalizeCanvasKey(key);
  const normalizedViewport = normalizeViewport(viewport);
  if (!normalizedKey || !normalizedViewport) return;
  const layouts = { ...loadLayouts() };
  const entry = layouts[normalizedKey] ?? { nodes: {}, removed: [] };
  layouts[normalizedKey] = { ...entry, viewport: normalizedViewport };
  saveLayouts(layouts);
  notify();
}

const listeners = new Set<() => void>();

function normalizeCanvasKey(key: string): string | null {
  const normalizedKey = key.trim();
  return normalizedKey ? normalizedKey : null;
}

function normalizeViewport(viewport: CanvasViewport): CanvasViewport | null {
  if (!Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return null;
  return {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: viewport.zoom,
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

/** React hook for the saved viewport of the active canvas key. */
export function useCanvasViewport(key: string): CanvasViewport | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getCanvasViewport(key),
    () => getCanvasViewport(key),
  );
}
