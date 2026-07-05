import { useEffect } from 'react';
import type { Player } from '@/core';
import type { CanvasMode } from '@/core';
import { isEditableTarget } from '@/lib/utils/keyboard';

export interface WorkspaceKeyboardOptions {
  mode: CanvasMode;
  present: boolean;
  setPresent: (v: boolean) => void;
  player: Player;
  helpOpen: boolean;
  paletteOpen: boolean;
  setHelpOpen: (v: boolean | ((h: boolean) => boolean)) => void;
  setPaletteOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleFocusCanvas: () => void;
}

export type WorkspaceKeyboardAction =
  | 'none'
  | 'toggle-palette'
  | 'close-palette'
  | 'close-help'
  | 'toggle-help'
  | 'toggle-focus-canvas'
  | 'toggle-present'
  | 'exit-presentation'
  | 'next-frame'
  | 'prev-frame'
  | 'toggle-play'
  | 'first-frame'
  | 'last-frame';

export interface WorkspaceKeyboardSnapshot {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  editableTarget?: boolean;
  mode: CanvasMode;
  present: boolean;
  helpOpen: boolean;
  paletteOpen: boolean;
}

export function resolveWorkspaceKeyboardAction(input: WorkspaceKeyboardSnapshot): WorkspaceKeyboardAction {
  if ((input.metaKey || input.ctrlKey) && input.key.toLowerCase() === 'k') return 'toggle-palette';
  if (input.editableTarget) return 'none';

  if (input.key === 'Escape') {
    if (input.paletteOpen) return 'close-palette';
    if (input.helpOpen) return 'close-help';
    if (input.present) return 'exit-presentation';
    return 'none';
  }

  if (input.paletteOpen) return 'none';
  if (input.helpOpen) return input.key === '?' ? 'close-help' : 'none';

  const transport = input.mode !== 'learn';
  switch (input.key) {
    case 'ArrowRight':
      return transport ? 'next-frame' : 'none';
    case 'ArrowLeft':
      return transport ? 'prev-frame' : 'none';
    case ' ':
      return transport ? 'toggle-play' : 'none';
    case 'Home':
      return transport ? 'first-frame' : 'none';
    case 'End':
      return transport ? 'last-frame' : 'none';
    case 'f':
    case 'F':
      return 'toggle-present';
    case 'c':
    case 'C':
      return 'toggle-focus-canvas';
    case '?':
      return 'toggle-help';
    default:
      return 'none';
  }
}

/** Global workspace keyboard shortcuts (transport, presentation, palette). */
export function useWorkspaceKeyboard({
  mode,
  present,
  setPresent,
  player,
  helpOpen,
  paletteOpen,
  setHelpOpen,
  setPaletteOpen,
  toggleFocusCanvas,
}: WorkspaceKeyboardOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = resolveWorkspaceKeyboardAction({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        editableTarget: isEditableTarget(e.target),
        mode,
        present,
        helpOpen,
        paletteOpen,
      });
      if (action === 'none') return;
      e.preventDefault();

      switch (action) {
        case 'toggle-palette':
          setPaletteOpen((p) => !p);
          break;
        case 'close-palette':
          setPaletteOpen(false);
          break;
        case 'close-help':
          setHelpOpen(false);
          break;
        case 'toggle-help':
          setHelpOpen((h) => !h);
          break;
        case 'toggle-focus-canvas':
          toggleFocusCanvas();
          break;
        case 'toggle-present':
          setPresent(!present);
          break;
        case 'exit-presentation':
          setPresent(false);
          break;
        case 'next-frame':
          player.next();
          break;
        case 'prev-frame':
          player.prev();
          break;
        case 'toggle-play':
          player.togglePlay();
          break;
        case 'first-frame':
          player.goTo(0);
          break;
        case 'last-frame':
          player.goTo(player.total - 1);
          break;
        default:
          unreachableKeyboardAction(action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    player.next,
    player.prev,
    player.togglePlay,
    player.goTo,
    player.total,
    present,
    setPresent,
    helpOpen,
    paletteOpen,
    setHelpOpen,
    mode,
    setPaletteOpen,
    toggleFocusCanvas,
  ]);
}

function unreachableKeyboardAction(action: never): never {
  throw new Error(`Unhandled workspace keyboard action: ${action}`);
}
