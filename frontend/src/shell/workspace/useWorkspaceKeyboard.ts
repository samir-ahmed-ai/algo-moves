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
  setHelpOpen: (v: boolean | ((h: boolean) => boolean)) => void;
  setPaletteOpen: (v: boolean | ((p: boolean) => boolean)) => void;
}

/** Global workspace keyboard shortcuts (transport, presentation, palette). */
export function useWorkspaceKeyboard({
  mode,
  present,
  setPresent,
  player,
  helpOpen,
  setHelpOpen,
  setPaletteOpen,
}: WorkspaceKeyboardOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      const t = e.target;
      if (isEditableTarget(t)) return;
      const transport = mode !== 'learn';
      switch (e.key) {
        case 'ArrowRight':
          if (!transport) break;
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          if (!transport) break;
          e.preventDefault();
          player.prev();
          break;
        case ' ':
          if (!transport) break;
          e.preventDefault();
          player.togglePlay();
          break;
        case 'Home':
          if (!transport) break;
          e.preventDefault();
          player.goTo(0);
          break;
        case 'End':
          if (!transport) break;
          e.preventDefault();
          player.goTo(player.total - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setPresent(!present);
          break;
        case '?':
          e.preventDefault();
          setHelpOpen((h) => !h);
          break;
        case 'Escape':
          if (helpOpen) setHelpOpen(false);
          else if (present) setPresent(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player.next, player.prev, player.togglePlay, player.goTo, present, setPresent, helpOpen, setHelpOpen, mode, setPaletteOpen]);
}
