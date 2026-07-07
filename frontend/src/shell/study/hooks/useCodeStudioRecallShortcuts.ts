import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CodeStudioPhase, EditorPrefs } from '@/store/user-prefs';

/**
 * Recall-phase keyboard shortcuts (window-level; editor shortcuts are in CodeMirror):
 *   ⌘/Ctrl + \              toggle blind mode
 *   ⌘/Ctrl + Alt + V        toggle Vim keybindings
 *   ⌘/Ctrl + Shift + R      clear the draft editor
 *   ⌘/Ctrl + Shift + -/+    decrease/increase font size
 *
 * CodeMirror (draft pane):
 *   ⌘/Ctrl + Shift + F      format both panes
 *   ⌘/Ctrl + Shift + I      auto-select block and indent
 *   ⌘/Ctrl + Alt + A        align selection on =
 *   ⌘/Ctrl + Alt + [        collapse sections (both panes)
 *   ⌘/Ctrl + Alt + ]        expand all sections
 *   Ctrl + Shift + [        fold line at cursor
 */
export function useCodeStudioRecallShortcuts({
  phase,
  vim,
  persistDraft,
  setBlind,
  fontSize,
  setEditorPrefs,
}: {
  phase: CodeStudioPhase;
  vim: boolean;
  persistDraft: (v: string) => void;
  setBlind: Dispatch<SetStateAction<boolean>>;
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
      // e.code (not e.key) so macOS ⌥ doesn't remap the character.
      if (e.altKey && e.code === 'KeyV') {
        e.preventDefault();
        setEditorPrefs({ vim: !vim });
      }
      if (e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        persistDraft('');
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
  }, [phase, vim, persistDraft, setBlind, fontSize, setEditorPrefs]);
}
