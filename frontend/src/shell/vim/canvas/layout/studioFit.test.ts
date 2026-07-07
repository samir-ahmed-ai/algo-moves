import { describe, expect, it } from 'vitest';
import { ORBIT_PANEL_WIDTH } from './orbitSlots';
import {
  DEFAULT_LAYOUT_CANVAS_W,
  STUDIO_DESKTOP_BREAKPOINT,
  STUDIO_REFERENCE_VIEWPORT_W,
  layoutCanvasWidthForViewport,
  resolveStudioChrome,
  studioMiddleColumnWidth,
} from './studioFit';

describe('studioFit', () => {
  it('subtracts both sidebars on desktop', () => {
    expect(studioMiddleColumnWidth(1280)).toBe(1280 - 2 * ORBIT_PANEL_WIDTH);
    expect(studioMiddleColumnWidth(1440)).toBe(1440 - 2 * ORBIT_PANEL_WIDTH);
  });

  it('uses full viewport width below the desktop breakpoint', () => {
    expect(studioMiddleColumnWidth(STUDIO_DESKTOP_BREAKPOINT - 1)).toBe(STUDIO_DESKTOP_BREAKPOINT - 1);
  });

  it('derives default flow canvas width from the reference viewport', () => {
    expect(DEFAULT_LAYOUT_CANVAS_W).toBe(layoutCanvasWidthForViewport(STUDIO_REFERENCE_VIEWPORT_W));
    expect(DEFAULT_LAYOUT_CANVAS_W).toBe(860);
  });

  it('resolves tighter chrome on mobile and roomier chrome on desktop', () => {
    expect(resolveStudioChrome(375)).toEqual({ top: 8, bottom: 120, x: 4 });
    expect(resolveStudioChrome(1280)).toEqual({ top: 56, bottom: 108, x: 8 });
  });
});
