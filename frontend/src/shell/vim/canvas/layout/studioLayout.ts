import type { Edge, Node } from '@xyflow/react';
import {
  HUD_NODE_ID,
  HUD_PANEL_HEIGHT,
  HUD_SLOT,
  HUD_TARGET_HANDLE,
  MAZE_HUD_SOURCE_HANDLE,
  MAZE_NODE_ID,
  ORBIT_V_GAP,
  STUDIO_INSET_X,
} from './orbitSlots';
import {
  DEFAULT_LAYOUT_CANVAS_W,
  STUDIO_REFERENCE_VIEWPORT_W,
  resolveStudioChrome,
} from './studioFit';

/** Reference flow height used before the container is measured. */
export const LAYOUT_CANVAS_H = 900;

/** Vertical space reserved for floating chrome (home/theme buttons) at the top. */
export const STUDIO_INSET_TOP = 52;
/** Vertical space reserved for keyboard HUD + hint bar at the bottom. */
export const STUDIO_INSET_BOTTOM = 16;

/** Default flow width before the parent container is measured. */
export const LAYOUT_CANVAS_W = DEFAULT_LAYOUT_CANVAS_W;

/** Full-width of the HUD and maze nodes (canvas minus horizontal insets). */
export const STUDIO_HUD_WIDTH = LAYOUT_CANVAS_W - 2 * STUDIO_INSET_X;

/** Flow-space height for the maze fill node (canvas minus both insets, HUD row, and gap). */
export const STUDIO_MAZE_HEIGHT =
  LAYOUT_CANVAS_H - STUDIO_INSET_TOP - STUDIO_INSET_BOTTOM - HUD_PANEL_HEIGHT - ORBIT_V_GAP;

export interface ResponsiveStudioMetrics {
  availW: number;
  availH: number;
  hudW: number;
  mazeW: number;
  mazeH: number;
}

/** Derive HUD/maze flow sizes from the React Flow parent container. */
export function computeResponsiveStudioMetrics(
  containerWidth: number,
  containerHeight: number,
  hudHeight = HUD_PANEL_HEIGHT,
  viewportWidth = STUDIO_REFERENCE_VIEWPORT_W,
): ResponsiveStudioMetrics {
  const chrome = resolveStudioChrome(viewportWidth);
  const availW = Math.max(320, Math.round(containerWidth - chrome.x * 2));
  const availH = Math.max(360, Math.round(containerHeight - chrome.top - chrome.bottom));
  const hudW = availW - 2 * STUDIO_INSET_X;
  const mazeW = hudW;
  const mazeH = Math.max(
    160,
    availH - STUDIO_INSET_TOP - STUDIO_INSET_BOTTOM - hudHeight - ORBIT_V_GAP,
  );

  return { availW, availH, hudW, mazeW, mazeH };
}

/** Fallback metrics when the container has not been measured yet. */
export function defaultResponsiveStudioMetrics(
  hudHeight = HUD_PANEL_HEIGHT,
): ResponsiveStudioMetrics {
  const chrome = resolveStudioChrome(STUDIO_REFERENCE_VIEWPORT_W);
  return computeResponsiveStudioMetrics(
    DEFAULT_LAYOUT_CANVAS_W + chrome.x * 2,
    LAYOUT_CANVAS_H + chrome.top + chrome.bottom,
    hudHeight,
    STUDIO_REFERENCE_VIEWPORT_W,
  );
}

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

/** Build React Flow nodes/edges for HUD top row + maze fill row. */
export function buildStudioLayout({
  mazeW,
  mazeH,
  hudW = HUD_SLOT.width,
  hudH = HUD_SLOT.height,
}: StudioLayoutInput): StudioLayoutResult {
  const hudX = STUDIO_INSET_X;
  const hudY = STUDIO_INSET_TOP;
  const mazeX = STUDIO_INSET_X;
  const mazeY = hudY + hudH + ORBIT_V_GAP;

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
