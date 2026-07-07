/** Light tap feedback on supported mobile browsers; no-op elsewhere. */
function vibrate(ms: number): void {
  if (typeof navigator === 'undefined') return;
  navigator.vibrate?.(ms);
}

export function hapticSuccess(): void {
  vibrate(10);
}

export function hapticError(): void {
  vibrate(12);
}
