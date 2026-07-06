import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { cycleRecallReveal } from '@/lib/editor/recallProgress';
import type { CodeStudioPhase, EditorPrefs } from '@/store/user-prefs';

/**
 * Recall-phase keyboard shortcuts, extracted from CodeStudioProvider:
 *   ⌘/Ctrl + \          toggle blind mode
 *   ⌘/Ctrl + Shift + R  clear the attempt editor
 *   ⌘/Ctrl + .          toggle the recall pointer between line-mirror and diff-aligned
 *   ⌘/Ctrl + Shift + .  cycle how much of the reference ahead is revealed (full/dim/blur/hidden)
 *   ⌘/Ctrl + Shift + -/+  decrease/increase font size
 */
export function useCodeStudioRecallShortcuts({
  phase,
  persistDraft,
  setBlind,
  pointerMode,
  recallReveal,
  fontSize,
  setEditorPrefs,
}: {
  phase: CodeStudioPhase;
  persistDraft: (v: string) => void;
  setBlind: Dispatch<SetStateAction<boolean>>;
  pointerMode: EditorPrefs['pointerMode'];
  recallReveal: EditorPrefs['recallReveal'];
  fontSize: EditorPrefs['fontSize'];
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
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
        persistDraft('');
      }
      if (e.key === '.' && e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ recallReveal: cycleRecallReveal(recallReveal) });
      }
      if (e.key === '.' && !e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ pointerMode: pointerMode === 'diff' ? 'line' : 'diff' });
      }
      if ((e.key === '=' || e.key === '+') && e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ fontSize: fontSize + 1 });
      }
      if (e.key === '-' && e.shiftKey) {
        e.preventDefault();
        setEditorPrefs({ fontSize: fontSize - 1 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, persistDraft, setBlind, pointerMode, recallReveal, fontSize, setEditorPrefs]);
}
