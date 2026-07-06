import { useEffect } from 'react';
import { isEditableTarget } from '@/lib/utils/keyboard';

/** Enter advances the studio arc when a next handler is available. */
export function useStudioNextShortcut(onNext?: () => void) {
  useEffect(() => {
    if (!onNext) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);
}
