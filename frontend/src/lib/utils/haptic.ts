/** Light tap feedback on supported mobile browsers; no-op elsewhere. */
export function hapticSuccess(): void {
  navigator.vibrate?.(10);
}

export function hapticError(): void {
  navigator.vibrate?.(12);
}
