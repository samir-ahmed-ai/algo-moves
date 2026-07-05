import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CodeStudioPhase } from '@/store/user-prefs';

/**
 * Recall-phase keyboard shortcuts, extracted from CodeStudioProvider:
 *   ⌘/Ctrl + \        toggle blind mode
 *   ⌘/Ctrl + Shift + R  reset the editor to the skeleton
 *   ⌘/Ctrl + Shift + V  toggle Vim keybindings
 */
export function useCodeStudioRecallShortcuts({
  phase,
  skeleton,
  persistDraft,
  vim,
  setEditorPrefs,
  setBlind,
}: {
  phase: CodeStudioPhase;
  skeleton: string;
  persistDraft: (v: string) => void;
  vim: boolean;
  setEditorPrefs: (patch: { vim: boolean }) => void;
  setBlind: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'recall') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '\\') {
        e.preventDefault();
        setBlind((b) => !b);
      }
      if (e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        persistDraft(skeleton);
      }
      if (e.key === 'v' && e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ vim: !vim });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skeleton, persistDraft, vim, setEditorPrefs, setBlind]);
}
