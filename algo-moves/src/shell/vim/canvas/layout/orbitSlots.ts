import { Position } from '@xyflow/react';

/** Shared panel width for HUD columns and sidebars. */
export const ORBIT_PANEL_WIDTH = 210;
export const ORBIT_PANEL_HEIGHT = 116;
export const HUD_COLUMN_GAP = 2;
export const HUD_PANEL_HEIGHT = 128;
export const HUD_PANEL_WIDTH = ORBIT_PANEL_WIDTH * 2 + HUD_COLUMN_GAP;

/** Gap between HUD and maze. */
export const ORBIT_V_GAP = 24;
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
