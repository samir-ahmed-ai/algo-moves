import type { PanelFlowNode, PanelNodeData, PanelNodeStyle } from '@/core/panelFlowTypes';
import { layoutFixedWidth } from '../layout/layout';

// Pure helpers for serializing/restoring a panel node's persisted position + width.
// Extracted from CanvasStage to keep the persistence math testable and side-effect free.

export function snapNodeWidth(n: PanelFlowNode): number | undefined {
  return n.width ?? undefined;
}

/** Persist position, size, and chrome state for session restore (#76). */
export function snapNodeLayout(n: PanelFlowNode): {
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
} {
  const data = n.data as PanelNodeData;
  const kind = data?.kind ?? n.id;
  const entry: {
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
  } = { position: n.position };
  if (kind !== 'viz' && kind !== 'workbench') {
    const w = snapNodeWidth(n);
    if (w != null) entry.width = w;
  }
  if (n.height != null) entry.height = n.height;
  if (n.parentId) entry.parentId = n.parentId;
  if (data.layoutSlots?.some(Boolean)) entry.layoutSlots = [...data.layoutSlots];
  if (data.slotIndex != null) entry.slotIndex = data.slotIndex;
  if (data.collapsed) entry.collapsed = true;
  if (data.locked) entry.locked = true;
  if (data.accent) entry.accent = data.accent;
  if (data.style && Object.keys(data.style).length > 0) entry.style = { ...data.style };
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
