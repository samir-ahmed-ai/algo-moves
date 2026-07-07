/** Deterministic shuffle keyed by `seed` so choices stay stable within a round. */
export function shuffleSeeded<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice();
  let s = (Number.isFinite(seed) ? Math.trunc(seed) : 0) * 2654435761 + 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const current = a[i]!;
    a[i] = a[j]!;
    a[j] = current;
  }
  return a;
}
