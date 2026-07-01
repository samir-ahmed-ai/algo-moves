/** Deterministic shuffle keyed by `seed` so choices stay stable within a round. */
export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed * 2654435761 + 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
