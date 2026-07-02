import { useCallback, useEffect, useRef } from 'react';

const TRANSITION_MS = 340;

/**
 * Owns the cross-fade timeout used to swap Code Studio phases after the fade.
 * Extracted from CodeStudioProvider so the timer plumbing lives in one place and
 * is always cleaned up on unmount.
 */
export function usePhaseTransition() {
  const transitionTimer = useRef<number | null>(null);

  const clearTransition = useCallback(() => {
    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
  }, []);

  /** Run a phase swap after the cross-fade, cancelling any pending one first. */
  const scheduleTransition = useCallback(
    (fn: () => void) => {
      clearTransition();
      transitionTimer.current = window.setTimeout(() => {
        transitionTimer.current = null;
        fn();
      }, TRANSITION_MS);
    },
    [clearTransition],
  );

  useEffect(() => clearTransition, [clearTransition]);

  return { scheduleTransition, clearTransition };
}
