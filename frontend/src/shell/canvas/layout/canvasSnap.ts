import type { Viewport } from '@xyflow/react';
import { CANVAS_MARGIN } from '../ui/canvasTokens';
import { layoutFixedWidth } from '../nodes/nodeTokens';
import type { PanelFlowNode } from '../nodes/PanelNode';

import type { CanvasSnapRegion } from '@/lib/canvas/layoutPrefs';

export type { CanvasSnapRegion };

export type FlowRect = { x: number; y: number; width: number; height: number };

/** Visible canvas area in flow coordinates. */
export function visibleFlowRect(
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
  margin = CANVAS_MARGIN,
): FlowRect {
  const { x, y, zoom } = viewport;
  const left = (-x + margin) / zoom;
  const top = (-y + margin) / zoom;
  const right = (containerWidth - x - margin) / zoom;
  const bottom = (containerHeight - y - margin) / zoom;
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/** Target bounds for a snap region within the visible canvas rect. */
export function regionRect(region: CanvasSnapRegion, visible: FlowRect): FlowRect {
  const { x, y, width, height } = visible;
  const halfW = width / 2;
  const halfH = height / 2;

  switch (region) {
    case 'left':
      return { x, y, width: halfW, height };
    case 'right':
      return { x: x + halfW, y, width: halfW, height };
    case 'top':
      return { x, y, width, height: halfH };
    case 'bottom':
      return { x, y: y + halfH, width, height: halfH };
    case 'top-left':
      return { x, y, width: halfW, height: halfH };
    case 'top-right':
      return { x: x + halfW, y, width: halfW, height: halfH };
    case 'bottom-left':
      return { x, y: y + halfH, width: halfW, height: halfH };
    case 'bottom-right':
      return { x: x + halfW, y: y + halfH, width: halfW, height: halfH };
    case 'center': {
      const cw = width * 0.6;
      const ch = height * 0.6;
      return { x: x + (width - cw) / 2, y: y + (height - ch) / 2, width: cw, height: ch };
    }
    case 'maximize':
      return { x, y, width, height };
  }
}

function capWidth(kind: string, width: number): number {
  const maxW = layoutFixedWidth(kind);
  return maxW != null ? Math.min(width, maxW) : width;
}

/** Snap the single selected node into a viewport region. Returns nodes unchanged if not exactly one selected. */
export function applyCanvasSnap(
  nodes: PanelFlowNode[],
  region: CanvasSnapRegion,
  visible: FlowRect,
): PanelFlowNode[] {
  const sel = nodes.filter((n) => n.selected);
  if (sel.length !== 1) return nodes;

  const target = regionRect(region, visible);
  const node = sel[0];
  const kind = node.data.kind ?? node.id;
  const width = capWidth(kind, target.width);
  const height = target.height;

  return nodes.map((n) => {
    if (n.id !== node.id) return n;
    return {
      ...n,
      position: { x: target.x, y: target.y },
      width,
      height,
    };
  });
}
