/** Light tap feedback on supported mobile browsers; no-op elsewhere. */
function vibrate(ms: number): void {
  if (typeof navigator === 'undefined') return;
  if (!Number.isFinite(ms) || ms <= 0) return;
  try {
    navigator.vibrate?.(Math.min(200, Math.round(ms)));
  } catch {
    // vibration is best-effort
  }
}

export function hapticSuccess(): void {
  vibrate(10);
}

export function hapticError(): void {
  vibrate(12);
}
