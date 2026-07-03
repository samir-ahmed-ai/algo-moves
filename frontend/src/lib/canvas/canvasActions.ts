import { createContext, useContext } from 'react';
import type { LayoutVisualizeOptions } from './layoutPrefs';

/** Zoom/focus helpers for canvas panels (practice flow, etc.). */
export interface CanvasActions {
  focusPanel: (id: string) => void;
  /** Focus the next panel in the mode wire chain; adds the panel if it was removed. */
  advancePractice: (fromId: string) => void;
  /** Spawn a panel wired to `fromId`, or focus it if already present. */
  spawnConnectedPanel: (panelId: string, fromId: string) => void;
  /** Current visualize layout options (viewport + preset) for incremental re-layout. */
  layoutVisualizeOptions: () => LayoutVisualizeOptions;
}

const ActionsCtx = createContext<CanvasActions | null>(null);

export const CanvasActionsContext = ActionsCtx;

export function useCanvasActions(): CanvasActions {
  const c = useContext(ActionsCtx);
  if (!c) throw new Error('useCanvasActions must be used inside a CanvasActionsProvider');
  return c;
}
