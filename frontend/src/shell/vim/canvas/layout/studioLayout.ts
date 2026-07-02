import type { Edge, Node } from '@xyflow/react';
import {
  HUD_NODE_ID,
  HUD_SLOT,
  HUD_TARGET_HANDLE,
  MAZE_HUD_SOURCE_HANDLE,
  MAZE_NODE_ID,
  ORBIT_TOP_EXTRA_GAP,
  ORBIT_V_GAP,
} from './orbitSlots';

/** Fixed flow-space canvas; fitView scales this to the viewport. */
export const LAYOUT_CANVAS_W = 1280;
export const LAYOUT_CANVAS_H = 900;

export interface StudioLayoutInput {
  mazeW: number;
  mazeH: number;
  hudW?: number;
  hudH?: number;
}

export interface StudioLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/** Build React Flow nodes/edges for HUD above maze in center stage. */
export function buildStudioLayout({
  mazeW,
  mazeH,
  hudW = HUD_SLOT.width,
  hudH = HUD_SLOT.height,
}: StudioLayoutInput): StudioLayoutResult {
  const cx = LAYOUT_CANVAS_W / 2;
  const cy = LAYOUT_CANVAS_H / 2;

  const stackH = hudH + ORBIT_V_GAP + ORBIT_TOP_EXTRA_GAP + mazeH;
  const stackTop = cy - stackH / 2;

  const hudX = cx - hudW / 2;
  const hudY = stackTop;
  const mazeX = cx - mazeW / 2;
  const mazeY = stackTop + hudH + ORBIT_V_GAP + ORBIT_TOP_EXTRA_GAP;

  const nodes: Node[] = [
    {
      id: HUD_NODE_ID,
      type: 'hud',
      position: { x: hudX, y: hudY },
      data: {},
      width: hudW,
      height: hudH,
      draggable: false,
      selectable: false,
    },
    {
      id: MAZE_NODE_ID,
      type: 'maze',
      position: { x: mazeX, y: mazeY },
      data: {},
      width: mazeW,
      height: mazeH,
      draggable: false,
      selectable: false,
    },
  ];

  const edges: Edge[] = [
    {
      id: 'orbit-hud',
      source: HUD_NODE_ID,
      sourceHandle: MAZE_HUD_SOURCE_HANDLE,
      target: MAZE_NODE_ID,
      targetHandle: HUD_TARGET_HANDLE,
      type: 'orbit',
      animated: false,
      selectable: false,
    },
  ];

  return { nodes, edges };
}
