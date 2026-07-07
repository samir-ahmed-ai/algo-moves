import { Position } from '@xyflow/react';

/** Shared panel width for HUD columns and sidebars. */
export const ORBIT_PANEL_WIDTH = 210;
export const ORBIT_PANEL_HEIGHT = 116;
export const HUD_COLUMN_GAP = 2;
/** Horizontal padding from the flow canvas edge to the HUD/maze nodes. */
export const STUDIO_INSET_X = 10;
export const HUD_PANEL_HEIGHT = 176;
/** Full studio canvas width minus horizontal insets (860 - 2×10 = 840). */
export const HUD_PANEL_WIDTH = (1280 - 2 * ORBIT_PANEL_WIDTH) - 2 * STUDIO_INSET_X;

/** Gap between HUD and maze. */
export const ORBIT_V_GAP = 12;
export const ORBIT_TOP_EXTRA_GAP = 0;

export const MAZE_NODE_ID = 'maze' as const;
export const HUD_NODE_ID = 'hud' as const;
export { MAZE_CELL_SIZE } from './mazeMetrics';

export const HUD_TARGET_HANDLE = 'in';
export const MAZE_HUD_SOURCE_HANDLE = 'hud';

/** @deprecated use HUD_TARGET_HANDLE */
export const SATELLITE_TARGET_HANDLE = HUD_TARGET_HANDLE;

export const HUD_SLOT = {
  id: HUD_NODE_ID,
  width: HUD_PANEL_WIDTH,
  height: HUD_PANEL_HEIGHT,
  hudSource: Position.Bottom,
  mazeTarget: Position.Top,
} as const;
