import { useEffect, useState } from 'react';

/**
 * Recall-phase stopwatch: ticks once per second while running and resets whenever
 * the active problem changes. Returns the raw setters too, so the provider keeps
 * driving start/stop/reset from its phase callbacks and exposes them via context.
 */
export function useCodeStudioTimer(itemId: string) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSec, setTimerSec] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const t = window.setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [timerRunning]);

  useEffect(() => {
    setTimerSec(0);
    setTimerRunning(false);
  }, [itemId]);

  const safeTimerSec = Number.isFinite(timerSec) ? Math.max(0, Math.floor(timerSec)) : 0;
  const timerLabel = `${String(Math.floor(safeTimerSec / 60)).padStart(2, '0')}:${String(
    safeTimerSec % 60,
  ).padStart(2, '0')}`;

  return { timerRunning, setTimerRunning, setTimerSec, timerLabel };
}
