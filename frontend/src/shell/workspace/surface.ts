import type { CanvasMode } from '@/core';
import type { TrackId } from '@/content';

export type WorkspaceSurface =
  | 'track-board'
  | 'category-board'
  | 'canvas'
  | 'play'
  | 'learn'
  | 'loading'
  | 'empty';

export type WorkspaceFallbackTarget = 'catalog' | 'home';

export interface ModeRouterInput {
  activeTrackId: TrackId | null;
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

export function resolveWorkspaceFallbackTarget(
  input: Pick<ModeRouterInput, 'activeTrackId' | 'activeCategoryId'>,
): WorkspaceFallbackTarget {
  return input.activeTrackId || input.activeCategoryId ? 'catalog' : 'home';
}
