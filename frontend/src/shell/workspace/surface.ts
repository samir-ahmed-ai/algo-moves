import type { CanvasMode } from '@/core';

export type WorkspaceSurface =
  | 'track-board'
  | 'category-board'
  | 'canvas'
  | 'play'
  | 'learn'
  | 'loading'
  | 'empty';

export interface ModeRouterInput {
  activeTrackId: string | null;
  activeCategoryId: string | null;
  problemFocused: boolean;
  mode: CanvasMode;
  ready: boolean;
  pluginLoading: boolean;
}

export function resolveWorkspaceSurface(input: ModeRouterInput): WorkspaceSurface {
  const { activeTrackId, activeCategoryId, problemFocused, mode, ready, pluginLoading } = input;
  if (activeTrackId && !activeCategoryId && !problemFocused) return 'track-board';
  if (activeCategoryId && !problemFocused) return 'category-board';
  if (mode === 'visualize' && !problemFocused) return 'canvas';
  if (mode === 'visualize') {
    if (ready) return 'canvas';
    if (pluginLoading) return 'loading';
    return 'empty';
  }
  if (ready) return mode === 'play' ? 'play' : 'learn';
  if (pluginLoading) return 'loading';
  return 'empty';
}
