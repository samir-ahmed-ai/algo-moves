import { useCallback, useEffect, useState } from 'react';
import { BOTTOM_RAIL_H, SIDEBAR_RAIL_W, SIDEBAR_W, SIDEBAR_WIDE_W } from '@/design/sidebarMetrics';
import type { LayoutDir, RightSidebarTab } from './workspace';

export interface ChromeStateOptions {
  requestFitCanvas: () => void;
  isMobile: boolean;
  initialDir: LayoutDir;
}

/** Sidebar / chrome layout state plus the chrome-dimension CSS-variable sync. */
export function useChromeState({ requestFitCanvas, isMobile, initialDir }: ChromeStateOptions) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightWide, setRightWide] = useState(false);
  const [present, setPresent] = useState(() => typeof location !== 'undefined' && /[?&]embed\b/.test(location.search));
  const [focusCanvas, setFocusCanvas] = useState(false);
  const [dir, setDir] = useState<LayoutDir>(initialDir);
  const [sidePanelTab, setSidePanelTab] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightSidebarTab>('analysis');

  const toggleFocusCanvas = useCallback(() => {
    setFocusCanvas((f) => {
      const next = !f;
      if (next) {
        setLeftOpen(false);
        setRightOpen(false);
      }
      requestFitCanvas();
      return next;
    });
  }, [requestFitCanvas]);

  // Sync chrome dimension CSS variables for viewport-fill layouts.
  useEffect(() => {
    const root = document.documentElement;
    if (present) {
      root.style.setProperty('--chrome-left', '0px');
      root.style.setProperty('--chrome-right', '0px');
      root.style.setProperty('--chrome-bottom', '0px');
      return;
    }
    // On mobile the sidebars float over the canvas as drawers, so they never
    // reserve flex width — keep the chrome offsets at the slim rail size.
    const left = !isMobile && leftOpen && !focusCanvas ? `${SIDEBAR_W}px` : `${SIDEBAR_RAIL_W}px`;
    let right = `${SIDEBAR_RAIL_W}px`;
    if (!isMobile && rightOpen && !focusCanvas) {
      right = `${rightWide ? SIDEBAR_WIDE_W : SIDEBAR_W}px`;
    }
    root.style.setProperty('--chrome-left', left);
    root.style.setProperty('--chrome-right', right);
    root.style.setProperty('--chrome-bottom', '0px');
    root.style.setProperty('--bottom-rail-h', `${BOTTOM_RAIL_H}px`);
  }, [present, leftOpen, rightOpen, rightWide, focusCanvas, isMobile]);

  return {
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    rightWide,
    setRightWide,
    present,
    setPresent,
    focusCanvas,
    toggleFocusCanvas,
    dir,
    setDir,
    sidePanelTab,
    setSidePanelTab,
    rightTab,
    setRightTab,
  };
}
