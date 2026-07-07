import { ORBIT_PANEL_WIDTH } from './orbitSlots';

/** Matches VimDojoPage `min-[960px]` grid — sidebars visible at/above this width. */
export const STUDIO_DESKTOP_BREAKPOINT = 960;

/** Reference viewport used to derive the default flow-space canvas width. */
export const STUDIO_REFERENCE_VIEWPORT_W = 1280;

/** Horizontal breathing room inside the middle column during fit (desktop default). */
export const STUDIO_CHROME_X = 8;

/** @deprecated use resolveStudioChrome(viewportWidth).top */
export const STUDIO_CHROME_TOP = 56;

/** @deprecated use resolveStudioChrome(viewportWidth).bottom */
export const STUDIO_CHROME_BOTTOM = 108;

export interface StudioChromeInsets {
  top: number;
  bottom: number;
  x: number;
}

/** Screen-space gutters for floating toolbar + bottom keyboard HUD, tuned per breakpoint. */
export function resolveStudioChrome(viewportWidth: number): StudioChromeInsets {
  if (viewportWidth >= STUDIO_DESKTOP_BREAKPOINT) {
    return { top: 56, bottom: 108, x: 8 };
  }
  if (viewportWidth >= 640) {
    return { top: 12, bottom: 112, x: 6 };
  }
  return { top: 8, bottom: 120, x: 4 };
}

/** Middle-column width: full viewport on mobile, viewport − 2× sidebars on desktop. */
export function studioMiddleColumnWidth(viewportWidth: number): number {
  if (viewportWidth >= STUDIO_DESKTOP_BREAKPOINT) {
    return Math.max(320, viewportWidth - 2 * ORBIT_PANEL_WIDTH);
  }
  return viewportWidth;
}

/** Flow-space canvas width sized for the middle column at a given viewport. */
export function layoutCanvasWidthForViewport(viewportWidth: number): number {
  return Math.max(720, studioMiddleColumnWidth(viewportWidth));
}

/** Default flow canvas width with desktop sidebars on a 1280px viewport (860px center). */
export const DEFAULT_LAYOUT_CANVAS_W = layoutCanvasWidthForViewport(STUDIO_REFERENCE_VIEWPORT_W);
