import { useEffect, useRef, useState } from 'react';

export type UseCountdownOptions = {
  /** When false the timer stays at `seconds` and does not tick. Default true. */
  enabled?: boolean;
  /** Bump to restart the countdown (e.g. turn index). */
  resetKey?: unknown;
  /** Called once when the timer reaches zero. */
  onExpire?: () => void;
  /** Skip ticking (e.g. prefers-reduced-motion). */
  skip?: boolean;
};

/**
 * Deadline-based turn timer shared across arcade games. Returns remaining seconds
 * and normalized progress for CountdownRing.
 */
export function useCountdown(
  seconds: number,
  { enabled = true, resetKey, onExpire, skip = false }: UseCountdownOptions = {},
): { remaining: number; progress: number } {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(seconds);
    if (skip || !enabled) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = seconds - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        setRemaining(0);
        window.clearInterval(id);
        onExpireRef.current?.();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [seconds, enabled, skip, resetKey]);

  return { remaining, progress: seconds > 0 ? remaining / seconds : 0 };
}
