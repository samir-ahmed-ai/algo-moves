import type { PanelFlowNode, PanelNodeData, PanelNodeStyle } from '@/core/panelFlowTypes';
import { layoutFixedWidth } from '../layout/layout';

// Pure helpers for serializing/restoring a panel node's persisted position + width.
// Extracted from CanvasStage to keep the persistence math testable and side-effect free.

function finiteNumber(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? Math.round(value!) : undefined;
}

function safePosition(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: finiteNumber(position.x) ?? 0,
    y: finiteNumber(position.y) ?? 0,
  };
}

export function snapNodeWidth(n: PanelFlowNode): number | undefined {
  return finiteNumber(n.width);
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
  snapFill?: boolean;
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
    snapFill?: boolean;
    accent?: string;
    style?: PanelNodeStyle;
  } = { position: safePosition(n.position) };
  if (kind !== 'viz' && kind !== 'workbench') {
    const w = snapNodeWidth(n);
    if (w != null) entry.width = w;
  }
  const height = finiteNumber(n.height);
  if (height != null) entry.height = height;
  if (n.parentId?.trim()) entry.parentId = n.parentId.trim();
  if (data.layoutSlots?.some(Boolean)) entry.layoutSlots = [...data.layoutSlots];
  if (Number.isInteger(data.slotIndex)) entry.slotIndex = data.slotIndex as number;
  if (data.collapsed) entry.collapsed = true;
  if (data.locked) entry.locked = true;
  if (data.snapFill) entry.snapFill = true;
  if (data.accent) entry.accent = data.accent;
  if (data.style && Object.keys(data.style).length > 0) entry.style = { ...data.style };
  return entry;
}

export function restoreNodeWidth(
  kind: string,
  savedWidth: number | undefined,
  layoutWidth: number | undefined,
): number | undefined {
  const raw = finiteNumber(savedWidth) ?? finiteNumber(layoutWidth);
  const maxW = layoutFixedWidth(kind);
  if (raw == null) return raw;
  return maxW != null ? Math.min(raw, maxW) : raw;
}
