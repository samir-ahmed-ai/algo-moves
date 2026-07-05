import { STRUDEL_NODE_W } from './nodeScale';

/**
 * App-chrome layout dimensions (px). Pure design tokens so app state (store)
 * can read them without importing shell chrome; shell chrome (SidebarShell,
 * chrome.ts) re-exports them for its own consumers.
 */
export const SIDEBAR_W = 192;
export const SIDEBAR_RAIL_W = 32;
export const SIDEBAR_WIDE_W = STRUDEL_NODE_W;
export const BOTTOM_RAIL_H = 24;
