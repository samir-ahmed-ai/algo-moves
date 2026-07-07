import { useEffect, useRef } from 'react';

/**
 * Fire `onReport` once while `active` is true. Resets when `active` becomes false
 * or when `resetToken` changes (e.g. rematch generation counter).
 */
export function useReportOnce(active: boolean, onReport: () => void, resetToken?: unknown): void {
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
  }, [resetToken]);

  useEffect(() => {
    if (!active || doneRef.current) return;
    doneRef.current = true;
    onReport();
  }, [active, onReport]);
}
