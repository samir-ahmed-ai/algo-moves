/**
 * Node-width scale constants — pure numbers, the design leaf's single source for
 * canvas node sizing. Re-exported by the shell/canvas token modules
 * (canvasTokens, nodeTokens) for their consumers, and by design/tokens so
 * plugins can read the width without importing up into shell/canvas.
 */
export const NODE_W = 400;

/** Max resize width for the problem panel. */
export const NODE_MAX_W = 600;

/** @deprecated Use NODE_W */
export const STRUDEL_NODE_W = NODE_W;

/** Legacy canvas node width (Tailwind `w-80`). */
export const LEGACY_STRUDEL_NODE_W = 320;

/** Uniform UI scale for Strudel-sized narrow panels — typography, padding, estimates. */
export const NODE_UI_SCALE = STRUDEL_NODE_W / LEGACY_STRUDEL_NODE_W;
