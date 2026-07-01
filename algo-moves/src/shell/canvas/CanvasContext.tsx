import { createContext, useContext } from 'react';
import type { Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content/types';
import type { LayoutVisualizeOptions } from './layout';

/**
 * Canvas state is split in two so panels only re-render for what they read:
 * `static` changes when the problem/input changes; `frame` changes every step.
 * Reference panels (code/cases/practice/inputs) read only `static` and stay
 * still during playback; the visualizer/move-log/caption read `frame`.
 */
export interface CanvasStatic {
  plugin: ProblemPlugin<any, any>;
  item: Item;
  inputId: string;
  setInputId: (id: string) => void;
  /** User's custom input override (null = using the selected sample). */
  customInput: unknown;
  setCustomInput: (v: unknown) => void;
}

export interface CanvasFrame {
  frames: Frame<any>[];
  player: Player;
  frame: Frame<any>;
}

const StaticCtx = createContext<CanvasStatic | null>(null);
const FrameCtx = createContext<CanvasFrame | null>(null);

export const CanvasStaticProvider = StaticCtx.Provider;
export const CanvasFrameProvider = FrameCtx.Provider;

export function useCanvasStatic() {
  const c = useContext(StaticCtx);
  if (!c) throw new Error('useCanvasStatic must be used inside <CanvasStage>');
  return c;
}

export function useCanvasFrame() {
  const c = useContext(FrameCtx);
  if (!c) throw new Error('useCanvasFrame must be used inside <CanvasStage>');
  return c;
}

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

export const CanvasActionsProvider = ActionsCtx.Provider;

export function useCanvasActions() {
  const c = useContext(ActionsCtx);
  if (!c) throw new Error('useCanvasActions must be used inside <CanvasStage>');
  return c;
}
