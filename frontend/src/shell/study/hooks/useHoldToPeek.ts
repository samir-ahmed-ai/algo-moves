import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';

/**
 * Hold-to-peek control for the recall reference. Reveals while held via pointer OR
 * keyboard (Enter/Space), and force-releases on pointerup / blur / tab-hide anywhere —
 * so peek can never get stuck ON when the press ends off the button or the window loses
 * focus (Cmd-Tab, native alert), which would otherwise leave blind mode revealed forever.
 */
export function useHoldToPeek(setPeek: Dispatch<SetStateAction<boolean>>) {
  const activeRef = useRef(false);

  const release = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setPeek(false);
  }, [setPeek]);

  const press = useCallback(() => {
    activeRef.current = true;
    setPeek(true);
  }, [setPeek]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) release();
    };
    // Guarded no-ops when not held, so global listeners are cheap.
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
      // Never leave peek latched if the toolbar unmounts mid-hold.
      release();
    };
  }, [release]);

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      // Don't steal focus from the editor when peeking with the mouse.
      e.preventDefault();
      press();
    },
    onPointerUp: release,
    onPointerLeave: release,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        press();
      }
    },
    onKeyUp: (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        release();
      }
    },
    onBlur: release,
  };
}
