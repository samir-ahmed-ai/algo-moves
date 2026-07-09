import type { CanvasMode } from '@/core';
import type { ItemKind, TrackId } from '@/content';

export type WorkspaceSurface =
  | 'track-board'
  | 'category-board'
  | 'canvas'
  | 'play'
  | 'learn'
  | 'reading'
  | 'assessment'
  | 'loading'
  | 'error'
  | 'empty';

export type WorkspaceFallbackTarget = 'catalog' | 'home';

export interface ModeRouterInput {
  activeTrackId: TrackId | null;
  activeCategoryId: string | null;
  problemFocused: boolean;
  /** Kind of the focused item — reading items route to their own surface. */
  itemKind?: ItemKind;
  mode: CanvasMode;
  ready: boolean;
  pluginLoading: boolean;
  runtimeError?: boolean;
}

export function resolveWorkspaceSurface(input: ModeRouterInput): WorkspaceSurface {
  const {
    activeTrackId,
    activeCategoryId,
    problemFocused,
    mode,
    ready,
    pluginLoading,
    runtimeError,
  } = input;
  if (activeTrackId && !activeCategoryId && !problemFocused) return 'track-board';
  if (activeCategoryId && !problemFocused) return 'category-board';
  // Reading / quiz items have no plugin — route them to their own surfaces before
  // the plugin-ready gate (which would otherwise fall through to 'empty').
  if (problemFocused && input.itemKind === 'reading') return 'reading';
  if (problemFocused && input.itemKind === 'quiz') return 'assessment';
  if (mode === 'visualize' && !problemFocused) return 'canvas';
  if (runtimeError) return 'error';
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
