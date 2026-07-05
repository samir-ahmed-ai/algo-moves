import { useCallback, useRef } from 'react';
import { loadLayouts, saveLayouts, type LayoutEntry } from '@/store/canvas-layout';
import { migrateLayouts } from '../layout/layoutMigration';

/** Persisted node positions/resizes per `${pluginId}:${mode}` key. */
export type Saved = Record<string, { position: { x: number; y: number }; width?: number }>;

/**
 * Per-(plugin, mode) canvas persistence, extracted from CanvasStage: dragged
 * positions/resizes plus which panels/edges the user trash-removed. Seeded from
 * localStorage (migrated from legacy formats) so a tweaked canvas survives reload (#73).
 */
export function useCanvasLayoutPersistence() {
  const persisted = useRef(migrateLayouts(loadLayouts()));
  const layoutRef = useRef<Record<string, Saved>>(
    Object.fromEntries(Object.entries(persisted.current).map(([k, v]) => [k, v.nodes])),
  );
  const removedRef = useRef<Record<string, Set<string>>>(
    Object.fromEntries(Object.entries(persisted.current).map(([k, v]) => [k, new Set(v.removed)])),
  );
  const removedEdgesRef = useRef<Record<string, Set<string>>>(
    Object.fromEntries(
      Object.entries(persisted.current).map(([k, v]) => [k, new Set(v.removedEdges ?? [])]),
    ),
  );

  const persist = useCallback(() => {
    const out: Record<string, LayoutEntry> = {};
    const keys = new Set([
      ...Object.keys(layoutRef.current),
      ...Object.keys(removedRef.current),
      ...Object.keys(removedEdgesRef.current),
    ]);
    for (const k of keys) {
      out[k] = {
        nodes: layoutRef.current[k] ?? {},
        removed: [...(removedRef.current[k] ?? [])],
        removedEdges: [...(removedEdgesRef.current[k] ?? [])],
      };
    }
    saveLayouts(out);
  }, []);

  return { layoutRef, removedRef, removedEdgesRef, persist };
}
