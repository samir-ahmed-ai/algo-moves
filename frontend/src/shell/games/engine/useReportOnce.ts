import { useEffect, useRef } from 'react';

/**
 * Fire `onReport` once while `active` is true. Resets when `active` becomes false
 * or when `resetToken` changes (e.g. rematch generation counter).
 */
export function useReportOnce(active: boolean, onReport: () => void, resetToken?: unknown): void {
  const doneRef = useRef(false);
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  useEffect(() => {
    doneRef.current = false;
  }, [active, resetToken]);

  useEffect(() => {
    if (!active || doneRef.current) return;
    doneRef.current = true;
    onReportRef.current();
  }, [active]);
}
