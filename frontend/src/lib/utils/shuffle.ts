/** Fisher-Yates shuffle. Returns a new array; the input is not mutated. */
export function shuffle<T>(arr: readonly T[], random: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = random();
    const j = Math.floor(Math.max(0, Math.min(0.999999999, Number.isFinite(r) ? r : 0)) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
