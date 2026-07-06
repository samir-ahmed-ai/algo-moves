import { useEffect } from 'react';
import { isEditableTarget } from '@/lib/utils/keyboard';

/** Enter advances the studio arc; Shift+Enter jumps to the last view when available. */
export function useStudioNextShortcut(onNext?: () => void, onNextAll?: () => void) {
  useEffect(() => {
    if (!onNext && !onNextAll) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey) {
        if (!onNextAll) return;
        e.preventDefault();
        onNextAll();
        return;
      }
      if (!onNext) return;
      e.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onNextAll]);
}
