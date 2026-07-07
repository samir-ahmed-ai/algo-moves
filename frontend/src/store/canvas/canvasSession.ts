import { useSyncExternalStore } from 'react';
import type { CanvasViewport } from '@/store/canvas-layout';
import { loadLayouts, saveLayouts } from '@/store/canvas-layout';

/** Read the persisted viewport for a canvas key, if any. */
export function getCanvasViewport(key: string): CanvasViewport | undefined {
  return loadLayouts()[key]?.viewport;
}

/** Persist the camera for a canvas key without disturbing node layout. */
export function saveCanvasViewport(key: string, viewport: CanvasViewport) {
  const layouts = { ...loadLayouts() };
  const entry = layouts[key] ?? { nodes: {}, removed: [] };
  layouts[key] = { ...entry, viewport };
  saveLayouts(layouts);
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook for the saved viewport of the active canvas key. */
export function useCanvasViewport(key: string): CanvasViewport | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getCanvasViewport(key),
    () => getCanvasViewport(key),
  );
}
