import { useEffect } from 'react';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { formatKeyEvent, isModifierOnlyKey } from '../../lib/formatKey';
import { useVimGame } from '../VimGameProvider';

const ACTION_KEYS = new Set([
  'Escape',
  'Enter',
  'r',
  '?',
  'h',
  'j',
  'k',
  'l',
  'w',
  'b',
  'e',
  '0',
  'g',
  'G',
  '$',
  '^',
  'f',
  'F',
  't',
  'T',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function isActionKey(key: string): boolean {
  return ACTION_KEYS.has(key) || (key.length === 1 && key >= '0' && key <= '9');
}

export function useVimKeyboard() {
  const { handleKey, recordKeyPress } = useVimGame();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (isModifierOnlyKey(e.key)) return;

      const label = formatKeyEvent(e);
      recordKeyPress(label);

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!isActionKey(e.key)) return;

      e.preventDefault();
      handleKey(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey, recordKeyPress]);
}
