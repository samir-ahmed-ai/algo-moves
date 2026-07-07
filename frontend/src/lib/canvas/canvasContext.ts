import { createContext, useContext } from 'react';
import type { Frame, Player, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import type { InputFrameCounts } from './inputFrameCounts';

/**
 * Canvas state is split in two so panels only re-render for what they read:
 * `static` changes when the problem/input changes; `frame` changes every step.
 */
export interface CanvasStatic {
  readonly plugin: ProblemPlugin<any, any>;
  readonly item: Item;
  readonly inputId: string;
  readonly setInputId: (id: string) => void;
  /** User's custom input override (null = using the selected sample). */
  readonly customInput: unknown;
  readonly setCustomInput: (v: unknown) => void;
  /** Memoized per-input frame counts — avoids re-running record() in panels. */
  readonly inputFrameCounts: InputFrameCounts;
  /** Viz selection (graph node index, array cell, etc.) scoped to the active canvas. */
  readonly selectedNode: number | null;
  readonly setSelectedNode: (n: number | null) => void;
}

export interface CanvasFrame {
  readonly frames: readonly Frame<any>[];
  readonly player: Player;
  readonly frame: Frame<any>;
  /** State keys that changed vs the previous frame (empty on frame 0). */
  readonly changedKeys: readonly string[];
}

const StaticCtx = createContext<CanvasStatic | null>(null);
const FrameCtx = createContext<CanvasFrame | null>(null);

export const CanvasStaticContext = StaticCtx;
export const CanvasFrameContext = FrameCtx;

export function useCanvasStatic(): CanvasStatic {
  const c = useContext(StaticCtx);
  if (!c) throw new Error('useCanvasStatic must be used inside a CanvasStaticProvider');
  return c;
}

export function useCanvasFrame(): CanvasFrame {
  const c = useContext(FrameCtx);
  if (!c) throw new Error('useCanvasFrame must be used inside a CanvasFrameProvider');
  return c;
}
