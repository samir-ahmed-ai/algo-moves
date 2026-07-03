import type { PanelFlowNode, PanelNodeData } from './PanelNode';
import { layoutFixedWidth } from '../layout/layout';

// Pure helpers for serializing/restoring a panel node's persisted position + width.
// Extracted from CanvasStage to keep the persistence math testable and side-effect free.

export function snapNodeWidth(n: PanelFlowNode): number | undefined {
  return n.width ?? undefined;
}

/** Persist position + width; viz width is layout-owned in visualize mode. */
export function snapNodeLayout(n: PanelFlowNode): { position: { x: number; y: number }; width?: number } {
  const kind = (n.data as PanelNodeData | undefined)?.kind ?? n.id;
  const entry: { position: { x: number; y: number }; width?: number } = { position: n.position };
  if (kind !== 'viz') {
    const w = snapNodeWidth(n);
    if (w != null) entry.width = w;
  }
  return entry;
}

export function restoreNodeWidth(
  kind: string,
  savedWidth: number | undefined,
  layoutWidth: number | undefined,
): number | undefined {
  const raw = savedWidth ?? layoutWidth;
  const maxW = layoutFixedWidth(kind);
  if (raw == null) return raw;
  return maxW != null ? Math.min(raw, maxW) : raw;
}
