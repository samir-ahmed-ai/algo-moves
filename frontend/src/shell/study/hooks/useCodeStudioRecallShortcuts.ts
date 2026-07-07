import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CodeStudioPhase, EditorPrefs } from '@/store/user-prefs';

/**
 * Recall-phase keyboard shortcuts:
 *   ⌘/Ctrl + \              toggle blind mode
 *   ⌘/Ctrl + Shift + R      clear the draft editor
 *   ⌘/Ctrl + Shift + -/+    decrease/increase font size
 */
export function useCodeStudioRecallShortcuts({
  phase,
  persistDraft,
  setBlind,
  fontSize,
  setEditorPrefs,
}: {
  phase: CodeStudioPhase;
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
  }, [phase, persistDraft, setBlind, fontSize, setEditorPrefs]);
}
