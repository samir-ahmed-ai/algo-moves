import { useEffect, useRef, useState } from 'react';

export type UseCountdownOptions = Readonly<{
  /** When false the timer stays at `seconds` and does not tick. Default true. */
  enabled?: boolean | undefined;
  /** Bump to restart the countdown (e.g. turn index). */
  resetKey?: unknown;
  /** Called once when the timer reaches zero. */
  onExpire?: (() => void) | undefined;
  /** Skip ticking (e.g. prefers-reduced-motion). */
  skip?: boolean | undefined;
}>;

export type CountdownState = Readonly<{ remaining: number; progress: number }>;

/**
 * Deadline-based turn timer shared across arcade games. Returns remaining seconds
 * and normalized progress for CountdownRing.
 */
export function useCountdown(
  seconds: number,
  { enabled = true, resetKey, onExpire, skip = false }: UseCountdownOptions = {},
): CountdownState {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const [remaining, setRemaining] = useState(safeSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(safeSeconds);
    if (skip || !enabled) return;
    if (safeSeconds === 0) {
      onExpireRef.current?.();
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, safeSeconds - Math.floor((Date.now() - started) / 1000));
      if (left <= 0) {
        setRemaining(0);
        window.clearInterval(id);
        onExpireRef.current?.();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [safeSeconds, enabled, skip, resetKey]);

  return { remaining, progress: safeSeconds > 0 ? remaining / safeSeconds : 0 };
}
