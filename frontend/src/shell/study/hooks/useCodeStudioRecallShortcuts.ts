import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { EditorView } from '@codemirror/view';
import { clampRecallFontSize } from '@/lib/editor/recallEditorTheme';
import type { CodeStudioPhase, EditorPrefs } from '@/store/user-prefs';

export type RecallShortcutAction =
  'toggle-blind' | 'toggle-vim' | 'clear-draft' | 'font-increase' | 'font-decrease';

/**
 * Pure resolver for recall window-level shortcuts. Matches on `e.code` (physical key,
 * layout- and modifier-independent) rather than `e.key`, because the shifted character
 * for R/=/- is 'R'/'+'/'_' — the previous `e.key` checks silently never fired.
 *
 *   ⌘/Ctrl + \              toggle blind mode
 *   ⌘/Ctrl + Alt + V        toggle Vim keybindings
 *   ⌘/Ctrl + Shift + R      clear the draft editor
 *   ⌘/Ctrl + Shift + = (+)  increase font size
 *   ⌘/Ctrl + Shift + -      decrease font size
 */
export function resolveRecallShortcut(e: KeyboardEvent): RecallShortcutAction | null {
  if (!(e.metaKey || e.ctrlKey)) return null;
  if (e.code === 'Backslash' || e.key === '\\') return 'toggle-blind';
  if (e.altKey && e.code === 'KeyV') return 'toggle-vim';
  if (e.shiftKey && e.code === 'KeyR') return 'clear-draft';
  if (e.shiftKey && e.code === 'Equal') return 'font-increase';
  if (e.shiftKey && e.code === 'Minus') return 'font-decrease';
  return null;
}

/**
 * Recall-phase keyboard shortcuts (window-level; editor shortcuts live in CodeMirror).
 * See {@link resolveRecallShortcut} for the chords.
 *
 * CodeMirror (draft pane) also binds: ⌘⇧F format both panes, ⌘⇧I auto-select+indent,
 * ⌘⌥A align on =, ⌘⌥[ / ⌘⌥] collapse/expand sections, Ctrl⇧[ fold line at cursor.
 */
export function useCodeStudioRecallShortcuts({
  phase,
  vim,
  persistDraft,
  setBlind,
  fontSize,
  setEditorPrefs,
  draftViewRef,
}: {
  phase: CodeStudioPhase;
  vim: boolean;
  persistDraft: (v: string) => void;
  setBlind: Dispatch<SetStateAction<boolean>>;
  fontSize: EditorPrefs['fontSize'];
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  /** When provided and populated, scopes shortcuts to the focused editor so
   *  co-mounted recall panels don't all react to one keypress. */
  draftViewRef?: MutableRefObject<EditorView | null>;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'recall') return;
      const action = resolveRecallShortcut(e);
      if (!action) return;

      // Only the focused editor instance handles the shortcut. If the ref is unset
      // (standalone RecallPane) or nothing specific is focused, fall through and handle.
      const el = draftViewRef?.current?.dom;
      const active = document.activeElement;
      if (el && active && active !== document.body && !el.contains(active)) return;

      e.preventDefault();
      switch (action) {
        case 'toggle-blind':
          setBlind((b) => !b);
          break;
        case 'toggle-vim':
          setEditorPrefs({ vim: !vim });
          break;
        case 'clear-draft':
          persistDraft('');
          break;
        case 'font-increase':
          setEditorPrefs({ fontSize: clampRecallFontSize(fontSize + 1) });
          break;
        case 'font-decrease':
          setEditorPrefs({ fontSize: clampRecallFontSize(fontSize - 1) });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, vim, persistDraft, setBlind, fontSize, setEditorPrefs, draftViewRef]);
}
